import { convertFileSrc } from "@tauri-apps/api/core";
import highResIcon from "../assets/icons/audio/High_Res_Audio.svg";

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  year: number | null;
  duration: number;
  file_path: string;
  cover_url: string;
  replay_gain: number | null;
  sample_rate: number | null;
  bit_depth: number | null;
}

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
  
  const DEFAULT_ART = "/default.jpg";

  if (!currentTrack) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: '#333' }}>
        <h1 style={{ fontWeight: 300, letterSpacing: '2px' }}>SELECT A TRACK TO BEGIN</h1>
      </div>
    );
  }

  const isHiRes = (currentTrack.bit_depth || 0) > 16 || (currentTrack.sample_rate || 0) > 44100;

  const formatTechnicalInfo = () => {
    const depth = currentTrack.bit_depth ? `${currentTrack.bit_depth}-BIT` : "-- BIT";
    const rate = currentTrack.sample_rate ? `${(currentTrack.sample_rate / 1000).toFixed(1)}KHZ` : "-- KHZ";
    const ext = currentTrack.file_path.split('.').pop()?.toUpperCase() || "AUDIO";
    return `${ext} ${depth} / ${rate}`;
  };

  const getArtPath = (path: string | null) => {
    if (!path || path === "" || path === "null") return DEFAULT_ART;
    if (path.startsWith("/default")) return path;
    return convertFileSrc(path);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#000', padding: '60px 80px', display: 'flex', flexDirection: 'column', gap: '50px', color: '#fff' }}>
      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-end' }}>
        <div style={{ width: '320px', height: '320px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,1)', flexShrink: 0, backgroundColor: '#111' }}>
          <img 
            key={currentTrack.id}
            src={getArtPath(currentTrack.cover_url)} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            alt="Album Cover" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith(DEFAULT_ART)) target.src = DEFAULT_ART;
            }}
          />
        </div>

        <div style={{ paddingBottom: '10px' }}>
          <h1 style={{ fontSize: '3.8rem', margin: 0, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1 }}>{currentTrack.title}</h1>
          <h2 style={{ fontSize: '1.8rem', margin: '12px 0', color: '#1db954', fontWeight: 500 }}>{currentTrack.artist}</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '30px', fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            <img 
              src={highResIcon} 
              style={{ 
                height: '24px', 
                marginRight: '8px',
                transition: 'all 0.5s ease',
                filter: isHiRes 
                  ? 'brightness(1.5) drop-shadow(0px 0px 15px rgba(29, 185, 84, 1))' 
                  : 'brightness(0.2) grayscale(1)'
              }} 
              alt="Hi-Res Audio" 
            />
            <span style={{ fontWeight: 600 }}>{currentTrack.album}</span>
            <span>•</span>
            <span>{currentTrack.year || "----"}</span>
            <span>•</span>
            <span style={{ letterSpacing: '1px', fontSize: '0.85rem', color: isHiRes ? '#1db954' : 'inherit' }}>
              {formatTechnicalInfo()}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs and Content Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '900px' }}>
        <div style={{ display: 'flex', gap: '35px', borderBottom: '1px solid #111' }}>
          {["Lyrics", "Details"].map((tab) => (
            <button
              key={tab}
              onClick={() => setNowPlayingTab(tab as any)}
              style={{ background: 'none', border: 'none', color: nowPlayingTab === tab ? '#fff' : '#444', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', borderBottom: nowPlayingTab === tab ? '2px solid #1db954' : '2px solid transparent', padding: '12px 0', transition: 'all 0.2s ease-in-out' }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '1.25rem', lineHeight: '1.8', padding: '10px 0' }}>
          {nowPlayingTab === "Lyrics" ? (
            <div style={{ color: '#888', fontStyle: 'italic' }}><p>Lyrics synchronization coming in the next update...</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '15px 20px', fontSize: '1.05rem', color: '#ccc' }}>
              <span style={{ color: '#555', fontWeight: 600 }}>File Path</span>
              <span style={{ wordBreak: 'break-all', opacity: 0.8 }}>{currentTrack.file_path}</span>
              <span style={{ color: '#555', fontWeight: 600 }}>Quality</span>
              <span>{currentTrack.bit_depth}-bit / {currentTrack.sample_rate} Hz</span>
              <span style={{ color: '#555', fontWeight: 600 }}>Replay Gain</span>
              <span>{currentTrack.replay_gain ? `${currentTrack.replay_gain} dB` : 'No Gain Data'}</span>
              <span style={{ color: '#555', fontWeight: 600 }}>Duration</span>
              <span>{Math.floor(currentTrack.duration / 60)}:{(currentTrack.duration % 60).toFixed(0).padStart(2, '0')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
