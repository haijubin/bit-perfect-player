use cpal::traits::{DeviceTrait, HostTrait};
use rb::RbConsumer;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

pub struct AudioEngine {
    pub device: cpal::Device,
    pub config: cpal::StreamConfig,
}

impl AudioEngine {
    pub fn new() -> Result<Self, String> {
        let host = cpal::default_host();
        let device = host.default_output_device().ok_or("No output device")?;
        let config = device.default_output_config().map_err(|e| e.to_string())?;
        Ok(Self { device, config: config.into() })
    }
    
    pub fn create_stream(
    &self,
    mut consumer: rb::Consumer<f32>, // Added mut
    elapsed_samples: Arc<AtomicU64>,
    clear_buffer_flag: Arc<AtomicBool>,
) -> Result<cpal::Stream, String> {
    let channels = self.config.channels as usize;

    let stream = self.device.build_output_stream(
        &self.config,
        move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
            // 1. Check for clear buffer (Flush)
            if clear_buffer_flag.load(Ordering::SeqCst) {
                let mut dummy = [0.0f32; 1024];
                while consumer.read(&mut dummy).unwrap_or(0) > 0 {}
                clear_buffer_flag.store(false, Ordering::SeqCst);
            }

            // 2. OPTIMIZED READ: Fill the hardware buffer in bulk
            // Instead of 1-by-1, we read the entire 'data' slice size from the ringbuffer
            let read_count = consumer.read(data).unwrap_or(0);
            
            // 3. Update the progress counter based on how many samples we actually got
            elapsed_samples.fetch_add(read_count as u64, Ordering::SeqCst);

            // 4. Zero-out the remainder of the buffer if the ringbuffer is empty 
            // This prevents "looping" or "stuttering" noise at the end of a track
            if read_count < data.len() {
                for sample in &mut data[read_count..] {
                    *sample = 0.0;
                }
            }
        },
        |err| {
            // Only print if it's not a standard notification to reduce CLI spam
            eprintln!("Stream error: {}", err);
        },
        None,
    ).map_err(|e| e.to_string())?;

    Ok(stream)
}
}
