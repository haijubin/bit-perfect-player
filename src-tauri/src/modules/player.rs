use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicU64, Ordering};
use rb::{SpscRb, RB, RbProducer}; // Added traits here
use symphonia::core::audio::SampleBuffer;
use tauri::Emitter;
use crate::modules::decoder::DecodedStream;
use crate::modules::audio_output::AudioEngine;
use cpal::traits::StreamTrait;

pub struct PlayerState {
    pub active_stream: Mutex<Option<cpal::Stream>>,
    pub elapsed_samples: Arc<AtomicU64>,
    pub is_playing: Arc<Mutex<bool>>,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            active_stream: Mutex::new(None),
            elapsed_samples: Arc::new(AtomicU64::new(0)),
            is_playing: Arc::new(Mutex::new(false)),
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
    let stream_data_res = DecodedStream::new(&file_path, replay_gain)?;
    let engine = AudioEngine::new()?;
    let sample_rate = engine.config.sample_rate as f32; // Fixed access

    state.elapsed_samples.store(0, Ordering::SeqCst);
    let ring_buffer = SpscRb::<f32>::new(65536);
    let (producer, consumer) = (ring_buffer.producer(), ring_buffer.consumer());

    let stream = engine.create_stream(consumer, Arc::clone(&state.elapsed_samples))?;
    stream.play().map_err(|e| e.to_string())?;
    
    *state.active_stream.lock().unwrap() = Some(stream);
    *state.is_playing.lock().unwrap() = true;

    let elapsed_clone = Arc::clone(&state.elapsed_samples);
    std::thread::spawn(move || {
        loop {
            // Divide by 2.0 for Stereo
            let seconds = (elapsed_clone.load(Ordering::SeqCst) as f32 / 2.0) / sample_rate;
            let _ = window.emit("progress", seconds);
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
    });

    let mut stream_data = stream_data_res;
    std::thread::spawn(move || {
        let mut sample_buf = None;
        loop {
            let packet = match stream_data.reader.next_packet() {
                Ok(p) => p,
                Err(_) => break,
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

                    let mut i = 0;
                    while i < samples.len() {
                        let written = producer.write(&samples[i..]).unwrap_or(0);
                        if written == 0 { std::thread::yield_now(); }
                        i += written;
                    }
                }
            }
        }
    });

    Ok("Playing".into())
}

#[tauri::command] // Added this macro to fix the main.rs error
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
