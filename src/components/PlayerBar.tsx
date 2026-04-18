import { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

interface PlayerBarProps {
  currentTrack: any;
  isPlaying: boolean;
  progress: number;
  rgEnabled: boolean;
  toggleRg: () => void;
  togglePlayback: () => void;
  handleSkip: (dir: "next" | "prev") => void;
  handleSeek: (time: number) => void;
  formatTime: (s: number) => string;
  onOutputClick?: () => void; // Restored output selector prop
}

export default function PlayerBar({
  currentTrack,
  isPlaying,
  progress,
  rgEnabled,
  toggleRg,
  togglePlayback,
  handleSkip,
  handleSeek,
  formatTime,
  onOutputClick
}: PlayerBarProps) {
  const [localProgress, setLocalProgress] = useState(progress);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  const duration = currentTrack?.duration || 0;
  
  // Calculate percentage for the green fill effect
  const progressPercent = duration > 0 ? (localProgress / duration) * 100 : 0;

  return (
    <footer className="player-bar">
      {/* Left: Album Art & Track Info */}
      <div className="track-info">
        <div className="cover-container">
          {currentTrack?.cover_url ? (
            <img 
              src={convertFileSrc(currentTrack.cover_url)} 
              alt="cover" 
              className="album-art"
            />
          ) : (
            <div className="art-placeholder">🎵</div>
          )}
        </div>
        <div className="text-container">
          <div className="track-title">{currentTrack?.title || "Not Playing"}</div>
          <div className="track-artist">{currentTrack?.artist || "Unknown Artist"}</div>
        </div>
      </div>

      {/* Center: Controls & Seekbar */}
      <div className="player-controls">
        <div className="button-row">
          <button className="ctrl-btn" onClick={() => handleSkip("prev")}>⏮</button>
          <button className="play-btn" onClick={togglePlayback}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button className="ctrl-btn" onClick={() => handleSkip("next")}>⏭</button>
        </div>

        <div className="seek-container">
          <span className="time-label">{formatTime(localProgress)}</span>
          <input
            type="range"
            min={0}
            max={duration}
            value={localProgress}
            onMouseDown={() => setIsDragging(true)}
            onChange={(e) => setLocalProgress(Number(e.target.value))}
            onMouseUp={() => {
              setIsDragging(false);
              handleSeek(localProgress);
            }}
            className="maestro-slider"
            style={{
              // This creates the "progress" fill effect
              background: `linear-gradient(to right, #1db954 ${progressPercent}%, #4d4d4d ${progressPercent}%)`
            }}
          />
          <span className="time-label">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: ReplayGain & Output Selector */}
      <div className="extra-controls">
        <button 
          onClick={toggleRg}
          className={`icon-btn rg-btn ${rgEnabled ? 'active' : ''}`}
          title="Toggle ReplayGain"
        >
          RG
        </button>
        <button 
          className="icon-btn" 
          onClick={onOutputClick}
          title="Select Audio Output"
        >
          🔊
        </button>
      </div>

      <style>{`
        .player-bar {
          height: 90px;
          background-color: #050505;
          border-top: 1px solid #111;
          display: grid;
          grid-template-columns: 30% 40% 30%;
          align-items: center;
          padding: 0 20px;
          z-index: 100;
        }

        .track-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .cover-container {
          width: 56px;
          height: 56px;
          background-color: #111;
          border-radius: 4px;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid #222;
        }

        .album-art { width: 100%; height: 100%; object-fit: cover; }

        .art-placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; opacity: 0.3;
        }

        .text-container { overflow: hidden; }

        .track-title {
          font-weight: 600; font-size: 0.85rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          color: #fff;
        }

        .track-artist { font-size: 0.75rem; color: #b3b3b3; margin-top: 4px; }

        .player-controls {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }

        .button-row { display: flex; align-items: center; gap: 24px; }

        .ctrl-btn {
          background: none; border: none; color: #b3b3b3;
          font-size: 1.2rem; cursor: pointer; transition: color 0.2s;
        }
        .ctrl-btn:hover { color: #fff; }

        .play-btn {
          background: #fff; border: none; width: 32px; height: 32px;
          border-radius: 50%; display: flex; align-items: center;
          justify-content: center; cursor: pointer; font-size: 1rem;
        }

        .seek-container {
          display: flex; width: 100%; align-items: center; gap: 10px;
        }

        .time-label {
          font-size: 0.7rem; color: #a7a7a7; width: 35px;
          font-variant-numeric: tabular-nums;
        }

        .maestro-slider {
          flex: 1; height: 4px; appearance: none;
          border-radius: 2px; outline: none; cursor: pointer;
          transition: background 0.1s ease;
        }

        /* Thumb Styling */
        .maestro-slider::-webkit-slider-thumb {
          appearance: none; width: 12px; height: 12px;
          background: #fff; border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
          opacity: 0; transition: opacity 0.2s;
        }

        .seek-container:hover .maestro-slider::-webkit-slider-thumb {
          opacity: 1;
        }

        .extra-controls {
          display: flex; justify-content: flex-end; align-items: center; gap: 15px;
        }

        .icon-btn {
          background: transparent; border: none; color: #b3b3b3;
          font-size: 1.1rem; cursor: pointer; transition: color 0.2s;
        }
        .icon-btn:hover { color: #fff; }

        .rg-btn {
          border: 1px solid #444; font-size: 0.6rem;
          font-weight: 800; padding: 3px 6px; border-radius: 3px;
        }
        .rg-btn.active { border-color: #1db954; color: #1db954; }
      `}</style>
    </footer>
  );
}
