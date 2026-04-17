use cpal::traits::{DeviceTrait, HostTrait};
use rb::RbConsumer; // Only need the trait here
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

pub struct AudioEngine {
    pub device: cpal::Device,
    pub config: cpal::StreamConfig,
}

impl AudioEngine {
    pub fn new() -> Result<Self, String> {
        let host = cpal::default_host();
        let device = host.default_output_device().ok_or("No output device")?;
        let config: cpal::StreamConfig = device.default_output_config().map_err(|e| e.to_string())?.into();
        Ok(Self { device, config })
    }

    // Use "impl" to allow passing the consumer trait
    pub fn create_stream(
        &self, 
        consumer: impl RbConsumer<f32> + Send + 'static, 
        elapsed_samples: Arc<AtomicU64>
    ) -> Result<cpal::Stream, String> {
        let stream = self.device.build_output_stream(
            &self.config,
            move |data: &mut [f32], _| {
                let read = consumer.read(data).unwrap_or(0);
                // Fill remaining buffer with silence if we run dry
                for i in read..data.len() { data[i] = 0.0; }
                elapsed_samples.fetch_add(read as u64, Ordering::SeqCst);
            },
            |err| eprintln!("Stream error: {}", err),
            None,
        ).map_err(|e| e.to_string())?;

        Ok(stream)
    }
}
