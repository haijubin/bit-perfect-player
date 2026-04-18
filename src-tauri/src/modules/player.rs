use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use rb::{RB, RbProducer}; 
use symphonia::core::audio::SampleBuffer;
use tauri::Emitter;
use crate::modules::decoder::DecodedStream;
use crate::modules::audio_output::AudioEngine;
use cpal::traits::StreamTrait;

pub struct PlayerState {
    pub active_stream: Mutex<Option<cpal::Stream>>,
    pub is_playing: Arc<Mutex<bool>>,
    pub elapsed_samples: Arc<AtomicU64>,
    pub seek_pending: Arc<Mutex<Option<f64>>>,      
    pub clear_buffer: Arc<AtomicBool>, 
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            active_stream: Mutex::new(None),
            is_playing: Arc::new(Mutex::new(false)),
            elapsed_samples: Arc::new(AtomicU64::new(0)),
            seek_pending: Arc::new(Mutex::new(None)),      
            clear_buffer: Arc::new(AtomicBool::new(false)), 
        }
    }
}

#[tauri::command]
pub fn start_bit_perfect_stream(
    file_path: String,
    replay_gain: Option<f32>,
    state: tauri::State<'_, PlayerState>,
    window: tauri::Window,
) -> Result<String, String> {
    let mut stream_data = DecodedStream::new(&file_path, replay_gain)?;
    let engine = AudioEngine::new()?;

    let file_sample_rate = stream_data.sample_rate as f64;
    let file_channels = stream_data.channels as f64;

    state.elapsed_samples.store(0, Ordering::SeqCst);
    state.clear_buffer.store(false, Ordering::SeqCst);
    
    let ring_buffer = rb::SpscRb::<f32>::new(65536);
    let (producer, consumer) = (ring_buffer.producer(), ring_buffer.consumer());

    // Pass elapsed_samples back into the audio thread!
    let stream = engine.create_stream(
        consumer, 
        Arc::clone(&state.elapsed_samples), 
        Arc::clone(&state.clear_buffer)
    )?;
    stream.play().map_err(|e| e.to_string())?;
    
    *state.active_stream.lock().unwrap() = Some(stream);
    *state.is_playing.lock().unwrap() = true;

    // --- THREAD A: PROGRESS EMITTER ---
    let elapsed_clone = Arc::clone(&state.elapsed_samples);
    let window_clone = window.clone();
    std::thread::spawn(move || {
        loop {
            let samples = elapsed_clone.load(Ordering::SeqCst) as f64;
            let seconds = (samples / file_channels) / file_sample_rate;
            let _ = window_clone.emit("progress", seconds);
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    });

    // --- THREAD B: DECODING & SEEK LOOP ---
    let seek_pending = Arc::clone(&state.seek_pending);
    let clear_buffer = Arc::clone(&state.clear_buffer);
    let elapsed_samples = Arc::clone(&state.elapsed_samples);

    std::thread::spawn(move || {
        let mut sample_buf: Option<SampleBuffer<f32>> = None;

        loop {
            // 1. Check for Seek Request
            {
                let mut pending = seek_pending.lock().unwrap();
                if let Some(time_s) = *pending {
                    if let Ok(_) = stream_data.seek(time_s) {
                        clear_buffer.store(true, Ordering::SeqCst);
                        let target_samples = (time_s * file_sample_rate * file_channels) as u64;
                        elapsed_samples.store(target_samples, Ordering::SeqCst);
                    }
                    *pending = None;
                }
            }

            // 2. Decode next packet
            let packet = match stream_data.reader.next_packet() {
                Ok(p) => p,
                Err(_) => break, // End of File
            };

            if let Ok(decoded) = stream_data.decoder.decode(&packet) {
                if sample_buf.is_none() {
                    sample_buf = Some(SampleBuffer::<f32>::new(decoded.capacity() as u64, *decoded.spec()));
                }
                
                if let Some(buf) = sample_buf.as_mut() {
                    buf.copy_interleaved_ref(decoded);
                    let mut samples = buf.samples().to_vec();
                    
                    if stream_data.multiplier != 1.0 {
                        for s in samples.iter_mut() { *s *= stream_data.multiplier; }
                    }

                    // 3. Write to Buffer
                    let mut i = 0;
                    while i < samples.len() {
                        if seek_pending.lock().unwrap().is_some() { break; }
                        
                        let written = producer.write(&samples[i..]).unwrap_or(0);
                        if written == 0 { 
                            std::thread::yield_now(); 
                            continue; 
                        }
                        i += written;
                    }
                }
            }
        }
    });

    Ok("Playing".into())
}

#[tauri::command]
pub fn toggle_playback(state: tauri::State<'_, PlayerState>) -> Result<bool, String> {
    let stream_lock = state.active_stream.lock().map_err(|_| "Failed to lock stream")?;
    let mut playing_lock = state.is_playing.lock().map_err(|_| "Failed to lock status")?;
    
    if let Some(stream) = stream_lock.as_ref() {
        if *playing_lock {
            stream.pause().map_err(|e| e.to_string())?;
            *playing_lock = false;
        } else {
            stream.play().map_err(|e| e.to_string())?;
            *playing_lock = true;
        }
        Ok(*playing_lock)
    } else {
        Err("No active stream".into())
    }
}

#[tauri::command]
pub fn seek_track(time_s: f64, state: tauri::State<'_, PlayerState>) -> Result<(), String> {
    let mut pending = state.seek_pending.lock().map_err(|_| "Failed to lock seek")?;
    *pending = Some(time_s);
    Ok(())
}
