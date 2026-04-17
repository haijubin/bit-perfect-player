use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::formats::{FormatReader, SeekMode, SeekTo, FormatOptions};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;
use std::fs::File;

pub struct DecodedStream {
    pub reader: Box<dyn FormatReader>,
    pub decoder: Box<dyn symphonia::core::codecs::Decoder>,
    pub multiplier: f32,
    pub sample_rate: u32, // Added to track file-specific rate
    pub channels: u32,    // Added to track file-specific channels
}

impl DecodedStream {
    pub fn new(file_path: &str, replay_gain: Option<f32>) -> Result<Self, String> {
        let src = File::open(file_path).map_err(|e| e.to_string())?;
        let mss = MediaSourceStream::new(Box::new(src), Default::default());
        
        let probed = symphonia::default::get_probe()
            .format(&Hint::new(), mss, &FormatOptions::default(), &MetadataOptions::default())
            .map_err(|e| e.to_string())?;

        let format = probed.format;
        
        // Find the first track that isn't null
        let track = format.tracks().iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .ok_or("No supported track")?;

        // Extract metadata for the math in player.rs
        let sample_rate = track.codec_params.sample_rate.unwrap_or(44100);
        let channels = track.codec_params.channels
            .map(|c| c.count() as u32)
            .unwrap_or(2);

        let decoder = symphonia::default::get_codecs()
            .make(&track.codec_params, &DecoderOptions::default())
            .map_err(|e| e.to_string())?;

        // Convert ReplayGain dB to linear multiplier if present
        let multiplier = replay_gain.map(|db| 10f32.powf(db / 20.0)).unwrap_or(1.0);

        Ok(Self {
            reader: format,
            decoder,
            multiplier,
            sample_rate,
            channels,
        })
    }

    pub fn seek(&mut self, time_s: f64) -> Result<(), String> {
        self.reader.seek(
            SeekMode::Accurate,
            SeekTo::Time {
                time: Time::from(time_s),
                track_id: None,
            },
        ).map_err(|e| e.to_string())?;

        // Reset the decoder so the next packet starts fresh (prevents audio glitches)
        self.decoder.reset();
        Ok(())
    }
}
