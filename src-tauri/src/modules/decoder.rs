use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::formats::{FormatOptions, FormatReader};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use std::fs::File;

pub struct DecodedStream {
    pub reader: Box<dyn FormatReader>,
    pub decoder: Box<dyn symphonia::core::codecs::Decoder>,
    pub multiplier: f32,
}

impl DecodedStream {
    pub fn new(file_path: &str, replay_gain: Option<f32>) -> Result<Self, String> {
        let src = File::open(file_path).map_err(|e| e.to_string())?;
        let mss = MediaSourceStream::new(Box::new(src), Default::default());
        let probed = symphonia::default::get_probe()
            .format(&Hint::new(), mss, &FormatOptions::default(), &MetadataOptions::default())
            .map_err(|e| e.to_string())?;

        let format = probed.format;
        let track = format.tracks().iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .ok_or("No supported track")?;

        // Removed the unused track_id variable line
        let decoder = symphonia::default::get_codecs()
            .make(&track.codec_params, &DecoderOptions::default())
            .map_err(|e| e.to_string())?;

        let multiplier = replay_gain.map(|db| 10f32.powf(db / 20.0)).unwrap_or(1.0);

        Ok(Self {
            reader: format,
            decoder,
            multiplier,
        })
    }
}
