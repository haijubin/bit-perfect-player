import { convertFileSrc } from "@tauri-apps/api/core";

interface Track {
  id: number;
  file_path: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  duration: number;
  cover_url: string;
  genre?: string;
}

interface NowPlayingProps {
  currentTrack: Track | null;
  nowPlayingTab: "Lyrics" | "Details";
  setNowPlayingTab: (tab: "Lyrics" | "Details") => void;
}

export default function NowPlaying({
  currentTrack,
  nowPlayingTab,
  setNowPlayingTab,
}: NowPlayingProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '60px', background: 'linear-gradient(180deg, #181818 0%, #000 100%)', minHeight: '100%' }}>
      {currentTrack ? (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '50px', marginBottom: '60px' }}>
            <img 
              src={convertFileSrc(currentTrack.cover_url)} 
              style={{ width: '380px', height: '380px', borderRadius: '16px', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }} 
              alt="Album Cover"
            />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ color: '#1db954', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '2px' }}>HI-RES AUDIO</span>
              <h1 style={{ fontSize: '4.5rem', margin: '15px 0', lineHeight: 1.1, fontWeight: 800 }}>{currentTrack.title}</h1>
              <h2 style={{ fontSize: '2rem', fontWeight: 400, opacity: 0.7 }}>{currentTrack.artist} — {currentTrack.album}</h2>
              <div style={{ marginTop: '30px', opacity: 0.4, fontSize: '0.9rem' }}>
                24-bit / 44.1kHz • {currentTrack.year} • {currentTrack.genre || "Unknown"}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #222', paddingTop: '40px', marginBottom: '50px' }}>
            <h3 style={{ fontSize: '0.8rem', opacity: 0.4, letterSpacing: '2px', marginBottom: '20px' }}>ALBUM NOTES</h3>
            <p style={{ fontSize: '1.3rem', lineHeight: 1.6, opacity: 0.8, maxWidth: '800px' }}>
              {currentTrack.album} is optimized for bit-perfect delivery. Capturing every nuance of the high-fidelity performance with native dynamic range.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '40px', borderBottom: '1px solid #222', marginBottom: '30px' }}>
            {["Lyrics", "Details"].map(t => (
              <button 
                key={t} 
                onClick={() => setNowPlayingTab(t as any)} 
                style={{ 
                  background: 'none', border: 'none', color: nowPlayingTab === t ? '#fff' : '#444', 
                  cursor: 'pointer', paddingBottom: '15px', fontSize: '1.1rem', fontWeight: 700, 
                  borderBottom: nowPlayingTab === t ? '3px solid #1db954' : 'none' 
                }}
              >
                {t}
              </button>
            ))}
          </div>
          
          {nowPlayingTab === "Lyrics" ? (
            <div style={{ fontSize: '2.5rem', fontWeight: 800, opacity: 0.9 }}>
              [Lyrics synchronization coming soon...]
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
              <div>
                <div style={{ opacity: 0.4, fontSize: '0.7rem', letterSpacing: '1px' }}>FORMAT</div>
                <div style={{ fontSize: '1.2rem', marginTop: '5px' }}>FLAC / Bit-Perfect</div>
              </div>
              <div>
                <div style={{ opacity: 0.4, fontSize: '0.7rem', letterSpacing: '1px' }}>YEAR</div>
                <div style={{ fontSize: '1.2rem', marginTop: '5px' }}>{currentTrack.year}</div>
              </div>
              <div>
                <div style={{ opacity: 0.4, fontSize: '0.7rem', letterSpacing: '1px' }}>GENRE</div>
                <div style={{ fontSize: '1.2rem', marginTop: '5px' }}>{currentTrack.genre || "Unknown"}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
          Ready to Play
        </div>
      )}
    </div>
  );
}
