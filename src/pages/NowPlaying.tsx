import { Track } from "../hooks/useAudioPlayer";
import { convertFileSrc } from "@tauri-apps/api/core";
// Import your local High-Res icon
import highResIcon from "../assets/icons/audio/High_Res_Audio.svg";

interface NowPlayingProps {
  currentTrack: Track | null;
  nowPlayingTab: "Lyrics" | "Details";
  setNowPlayingTab: (tab: "Lyrics" | "Details") => void;
}

export default function NowPlaying({ 
  currentTrack, 
  nowPlayingTab, 
  setNowPlayingTab 
}: NowPlayingProps) {
  
  // Constant for our default asset
  const DEFAULT_ART = "/default.jpg";

  // Display a placeholder if nothing is playing
  if (!currentTrack) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#000',
        color: '#333' 
      }}>
        <h1 style={{ fontWeight: 300, letterSpacing: '2px' }}>SELECT A TRACK TO BEGIN</h1>
      </div>
    );
  }

  // Determine if we should show the High-Res badge based on file extension
  const isHiRes = currentTrack.file_path.toLowerCase().endsWith('.flac') || 
                  currentTrack.file_path.toLowerCase().endsWith('.wav');

  // Helper to determine image source based on DB value
  const getArtPath = (path: string | null) => {
    if (!path || path === "" || path === "null") return DEFAULT_ART;
    // If it starts with /default, it is our public web asset
    if (path.startsWith("/default")) return path;
    // Otherwise it is a system path requiring conversion
    return convertFileSrc(path);
  };

  return (
    <div style={{ 
      height: '100%', 
      overflowY: 'auto', 
      backgroundColor: '#000', 
      padding: '60px 80px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '50px',
      color: '#fff'
    }}>
      {/* --- TOP SECTION: Album Art & Track Header --- */}
      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-end' }}>
        <div style={{ 
          width: '320px', 
          height: '320px', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          boxShadow: '0 20px 60px rgba(0,0,0,1)',
          flexShrink: 0,
          backgroundColor: '#111' // Dark background while loading
        }}>
          <img 
            key={currentTrack.id} // Forces re-render on track change
            src={getArtPath(currentTrack.cover_url)} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            alt="Album Cover" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith(DEFAULT_ART)) {
                target.src = DEFAULT_ART;
              }
            }}
          />
        </div>

        <div style={{ paddingBottom: '10px' }}>
          <h1 style={{ fontSize: '3.8rem', margin: 0, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            {currentTrack.title}
          </h1>
          <h2 style={{ fontSize: '1.8rem', margin: '12px 0', color: '#1db954', fontWeight: 500 }}>
            {currentTrack.artist}
          </h2>
          
          {/* Metadata Row with Glowing High-Res Icon */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginTop: '30px', 
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.6)' 
          }}>
            {isHiRes && (
              <img 
                src={highResIcon} 
                style={{ 
                  height: '24px', 
                  marginRight: '8px',
                  filter: 'brightness(1.4) drop-shadow(0px 0px 10px rgba(29, 185, 84, 0.7))',
                }} 
                alt="Hi-Res Audio" 
              />
            )}
            <span style={{ fontWeight: 600 }}>{currentTrack.album}</span>
            <span>•</span>
            <span>{currentTrack.year || "----"}</span>
            <span>•</span>
            <span style={{ letterSpacing: '1px', fontSize: '0.85rem' }}>
              {isHiRes ? 'FLAC 24-BIT / 96KHZ' : 'MPEG-3 / 320KBPS'}
            </span>
          </div>
        </div>
      </div>

      {/* --- BOTTOM SECTION: Content Tabs --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '900px' }}>
        {/* Tab Headers */}
        <div style={{ display: 'flex', gap: '35px', borderBottom: '1px solid #111' }}>
          {["Lyrics", "Details"].map((tab) => (
            <button
              key={tab}
              onClick={() => setNowPlayingTab(tab as any)}
              style={{
                background: 'none', 
                border: 'none',
                color: nowPlayingTab === tab ? '#fff' : '#444',
                cursor: 'pointer', 
                fontWeight: 700,
                fontSize: '1.1rem',
                borderBottom: nowPlayingTab === tab ? '2px solid #1db954' : '2px solid transparent',
                padding: '12px 0',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div style={{ fontSize: '1.25rem', lineHeight: '1.8', padding: '10px 0' }}>
          {nowPlayingTab === "Lyrics" ? (
            <div style={{ color: '#888', fontStyle: 'italic' }}>
              <p>Lyrics synchronization coming in the next update...</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '150px 1fr', 
              gap: '15px 20px', 
              fontSize: '1.05rem',
              color: '#ccc' 
            }}>
              <span style={{ color: '#555', fontWeight: 600 }}>File Path</span>
              <span style={{ wordBreak: 'break-all', opacity: 0.8 }}>{currentTrack.file_path}</span>
              
              <span style={{ color: '#555', fontWeight: 600 }}>Replay Gain</span>
              <span>
                {currentTrack.replay_gain 
                  ? `${currentTrack.replay_gain} dB` 
                  : 'No Gain Data'}
              </span>

              <span style={{ color: '#555', fontWeight: 600 }}>Duration</span>
              <span>{Math.floor(currentTrack.duration / 60)}:{(currentTrack.duration % 60).toFixed(0).padStart(2, '0')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
