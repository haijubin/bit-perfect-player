import { convertFileSrc } from "@tauri-apps/api/core";

interface Track {
  id: number;
  file_path: string;
  title: string;
  artist: string;
  cover_url: string;
  duration: number;
  replay_gain: number | null;
}

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  rgEnabled: boolean;
  toggleRg: () => void;
  togglePlayback: () => void;
  handleSkip: (forward: boolean) => void;
  formatTime: (s: number) => string;
}

export default function PlayerBar({
  currentTrack,
  isPlaying,
  progress,
  rgEnabled,
  toggleRg,
  togglePlayback,
  handleSkip,
  formatTime
}: PlayerBarProps) {
  const hasMetadata = currentTrack?.replay_gain !== null;
  const isActive = rgEnabled && hasMetadata;

  return (
    <footer style={{ 
      height: '95px', 
      backgroundColor: '#050505', 
      borderTop: '1px solid #111', 
      display: 'flex', 
      alignItems: 'center', 
      padding: '0 25px', 
      justifyContent: 'space-between', 
      zIndex: 10 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '300px' }}>
        <div style={{ width: '52px', height: '52px', background: '#111', borderRadius: '6px', overflow: 'hidden' }}>
          {currentTrack && <img src={convertFileSrc(currentTrack.cover_url)} style={{ width: '100%' }} />}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{currentTrack?.title || "Maestro"}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{currentTrack?.artist || "Ready"}</div>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '650px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '8px' }}>
          <button onClick={() => handleSkip(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>⏮</button>
          <button onClick={togglePlayback} style={{ 
            background: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', 
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <span style={{ color: '#000', fontSize: '1.2rem' }}>{isPlaying ? "Ⅱ" : "▶"}</span>
          </button>
          <button onClick={() => handleSkip(true)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>⏭</button>
          
          {/* Replay Gain Interactive Switch */}
          <button 
            onClick={hasMetadata ? toggleRg : undefined}
            title={hasMetadata ? `RG: ${currentTrack?.replay_gain} dB` : "No RG metadata"}
            style={{
              background: 'none',
              cursor: hasMetadata ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '4px',
              border: `1px solid ${isActive ? '#1db954' : '#333'}`,
              transition: 'all 0.3s ease',
              opacity: hasMetadata ? 1 : 0.2,
            }}
          >
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: isActive ? '#1db954' : '#666',
              boxShadow: isActive ? '0 0 10px #1db954' : 'none',
            }} />
            <span style={{ fontSize: '10px', fontWeight: 900, color: isActive ? '#1db954' : '#666' }}>
              RG {isActive ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '0.7rem', opacity: 0.4, width: '35px', textAlign: 'right' }}>{formatTime(progress)}</span>
          <div style={{ flex: 1, height: '4px', backgroundColor: '#222', borderRadius: '2px', position: 'relative' }}>
            <div style={{ 
              width: `${(progress / (currentTrack?.duration || 1)) * 100}%`, 
              height: '100%', backgroundColor: '#fff', borderRadius: '2px' 
            }} />
          </div>
          <span style={{ fontSize: '0.7rem', opacity: 0.4, width: '35px' }}>-{formatTime((currentTrack?.duration || 0) - progress)}</span>
        </div>
      </div>

      <div style={{ width: '300px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '35px', height: '35px', background: '#111', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎩</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem' }}>🔊</span>
          <span style={{ fontWeight: 700 }}>50</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6rem', opacity: 0.4, letterSpacing: '1px' }}>SYSTEM OUTPUT</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>This Computer</div>
        </div>
      </div>
    </footer>
  );
}
