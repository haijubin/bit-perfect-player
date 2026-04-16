use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use rb::{RbConsumer, RbProducer, SpscRb, RB};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicU64, Ordering};
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use tauri::Emitter;

pub struct PlayerState {
    pub active_stream: Mutex<Option<cpal::Stream>>,
    pub elapsed_samples: Arc<AtomicU64>,
    pub is_playing: Arc<Mutex<bool>>,
}

// Manually defining what "Default" looks like for your state
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
    state: tauri::State<'_, PlayerState>,
    window: tauri::Window,
) -> Result<String, String> {
    state.elapsed_samples.store(0, Ordering::SeqCst);

    let src = std::fs::File::open(&file_path).map_err(|e| e.to_string())?;
    let mss = MediaSourceStream::new(Box::new(src), Default::default());
    let probed = symphonia::default::get_probe()
        .format(&Hint::new(), mss, &FormatOptions::default(), &MetadataOptions::default())
        .map_err(|e| e.to_string())?;

    let mut format = probed.format;
    let track = format.tracks().iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or("No supported track")?;

    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| e.to_string())?;

    let ring_buffer = SpscRb::<f32>::new(65536);
    let (producer, consumer) = (ring_buffer.producer(), ring_buffer.consumer());

    let host = cpal::default_host();
    let device = host.default_output_device().ok_or("No device")?;
    let mut config: cpal::StreamConfig = device.default_output_config().unwrap().into();
    config.buffer_size = cpal::BufferSize::Fixed(4096);
    let sample_rate = config.sample_rate as f32; 

    let elapsed_clone = Arc::clone(&state.elapsed_samples);
    let stream = device.build_output_stream(
        &config,
        move |data: &mut [f32], _| {
            let read = consumer.read(data).unwrap_or(0);
            for i in read..data.len() { data[i] = 0.0; }
            elapsed_clone.fetch_add(read as u64, Ordering::SeqCst);
        },
        |err| eprintln!("Stream error: {}", err),
        None,
    ).map_err(|e| e.to_string())?;

    stream.play().map_err(|e| e.to_string())?;
    *state.active_stream.lock().unwrap() = Some(stream);

    let elapsed_for_emitter = Arc::clone(&state.elapsed_samples);
    std::thread::spawn(move || {
        loop {
            let elapsed = elapsed_for_emitter.load(Ordering::SeqCst);
            let seconds = (elapsed as f32 / 2.0) / sample_rate;
            let _ = window.emit("progress", seconds);
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
    });

    std::thread::spawn(move || {
        let mut sample_buf = None;
        let _ = thread_priority::set_current_thread_priority(thread_priority::ThreadPriority::Max);
        loop {
            let packet = match format.next_packet() {
                Ok(p) => p,
                Err(_) => break,
            };
            if let Ok(decoded) = decoder.decode(&packet) {
                if sample_buf.is_none() {
                    let spec = *decoded.spec();
                    sample_buf = Some(SampleBuffer::<f32>::new(decoded.capacity() as u64, spec));
                }
                if let Some(buf) = sample_buf.as_mut() {
                    buf.copy_interleaved_ref(decoded);
                    let samples = buf.samples();
                    let mut i = 0;
                    while i < samples.len() {
                        let written = producer.write(&samples[i..]).unwrap_or(0);
                        if written == 0 {  std::thread::yield_now(); }
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
            // If currently playing, pause it
            stream.pause().map_err(|e| e.to_string())?;
            *playing_lock = false;
        } else {
            // If currently paused, play it
            stream.play().map_err(|e| e.to_string())?;
            *playing_lock = true;
        }
        Ok(*playing_lock)
    } else {
        Err("No active stream found".into())
    }
}
