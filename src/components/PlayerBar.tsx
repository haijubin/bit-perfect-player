import { useMemo, useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import playIcon from "../assets/icons/audio/play.svg";
import pauseIcon from "../assets/icons/audio/pause.svg";
import skipFwdIcon from "../assets/icons/audio/skip_fwd.svg";
import skipRevIcon from "../assets/icons/audio/skip_rev.svg";
import highResIcon from "../assets/icons/audio/High_Res_Audio.svg";
import outputIcon from "../assets/icons/audio/output.svg";

interface Track {
  id: number;
  file_path: string;
  title: string;
  artist: string;
  cover_url: string;
  duration: number;
  replay_gain: number | null;
  sample_rate: number | null;
  bit_depth: number | null;
}

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  togglePlayback: () => void;
  handleSkip: (forward: boolean) => void;
  handleSeek: (timeS: number) => void; 
  formatTime: (s: number) => string;
}

export default function PlayerBar({
  currentTrack,
  isPlaying,
  progress,
  togglePlayback,
  handleSkip,
  handleSeek,
  formatTime
}: PlayerBarProps) {
  
  // Local state to manage slider while user is actively dragging
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);

  // Sync local progress with global progress when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  const DEFAULT_ART = "/default.jpg";

  const isHiRes = useMemo(() => {
    if (!currentTrack) return false;
    const rate = currentTrack.sample_rate || 0;
    const depth = currentTrack.bit_depth || 0;
    return depth > 16 || rate > 44100;
  }, [currentTrack]);

  const iconStyle = { width: '20px', height: '20px', filter: 'invert(1)' };

  const getArtPath = (path: string | null | undefined) => {
    if (!path || path === "" || path === "null") return DEFAULT_ART;
    if (path.startsWith("/default")) return path;
    return convertFileSrc(path);
  };

  const seekPercentage = useMemo(() => {
    const duration = currentTrack?.duration || 1;
    return (localProgress / duration) * 100;
  }, [localProgress, currentTrack]);

  // Defensive wrapper for seeking
  const onSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLocalProgress(val);
    if (typeof handleSeek === "function") {
      handleSeek(val);
    } else {
      console.warn("handleSeek is not defined in PlayerBar props");
    }
  };

  return (
    <footer style={{ 
      height: '95px', backgroundColor: '#050505', borderTop: '1px solid #111', 
      display: 'flex', alignItems: 'center', padding: '0 25px', justifyContent: 'space-between', zIndex: 10 
    }}>
      {/* Track Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '350px' }}>
        <div style={{ 
          width: '52px', height: '52px', background: '#111', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 
        }}>
          {currentTrack && (
            <img 
              src={getArtPath(currentTrack.cover_url)} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              alt="cover" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith(DEFAULT_ART)) target.src = DEFAULT_ART;
              }}
            />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {currentTrack?.title || "No Track Selected"}
            </span>
            {currentTrack && (
              <img 
                src={highResIcon} 
                style={{ 
                  height: '14px', 
                  flexShrink: 0,
                  transition: 'all 0.3s ease',
                  filter: isHiRes 
                    ? 'brightness(1.2) drop-shadow(0px 0px 8px rgba(29, 185, 84, 0.8))' 
                    : 'brightness(0.2) grayscale(1)'
                }} 
                alt="Hi-Res" 
              />
            )}
          </div>
          <span style={{ fontSize: '0.8rem', opacity: 0.6, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {currentTrack?.artist || "Unknown Artist"}
          </span>
        </div>
      </div>

      {/* Main Controls */}
      <div style={{ flex: 1, maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <button onClick={() => handleSkip(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <img src={skipRevIcon} style={iconStyle} alt="Previous" />
          </button>
          <button 
            onClick={togglePlayback} 
            style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
          >
            <img src={isPlaying ? pauseIcon : playIcon} style={{ width: '18px', height: '18px' }} alt="Play/Pause" />
          </button>
          <button onClick={() => handleSkip(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <img src={skipFwdIcon} style={iconStyle} alt="Next" />
          </button>
        </div>

        {/* Progress Bar (Interactive Slider) */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '0.7rem', opacity: 0.4, width: '40px', textAlign: 'right' }}>
            {formatTime(localProgress)}
          </span>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
            <input 
              type="range"
              min="0"
              max={currentTrack?.duration || 1}
              value={localProgress}
              step="0.1"
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onChange={onSeekChange}
              className="seek-slider"
              style={{
                width: '100%',
                height: '4px',
                appearance: 'none',
                backgroundColor: '#222',
                borderRadius: '2px',
                outline: 'none',
                cursor: 'pointer',
                background: `linear-gradient(to right, #1db954 ${seekPercentage}%, #222 ${seekPercentage}%)`
              }}
            />
          </div>

          <span style={{ fontSize: '0.7rem', opacity: 0.4, width: '40px' }}>
            {currentTrack ? formatTime(currentTrack.duration) : "0:00"}
          </span>
        </div>
      </div>

      {/* Volume/Output (Placeholder) */}
      <div style={{ width: '350px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
        <img src={outputIcon} style={{ width: '22px', height: '22px', filter: 'invert(1)', opacity: 0.7 }} alt="Output" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1rem', opacity: 0.7 }}>🔊</span>
          <div style={{ width: '80px', height: '4px', backgroundColor: '#222', borderRadius: '2px' }}>
            <div style={{ width: '70%', height: '100%', backgroundColor: '#fff', borderRadius: '2px' }} />
          </div>
        </div>
      </div>

      <style>{`
        .seek-slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: #fff;
          border-radius: 50%;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .seek-slider:hover::-webkit-slider-thumb {
          opacity: 1;
        }
      `}</style>
    </footer>
  );
}
