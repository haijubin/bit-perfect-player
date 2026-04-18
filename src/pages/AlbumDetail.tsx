import { convertFileSrc } from "@tauri-apps/api/core";

interface Track {
  id: number;
  title: string;
  artist: string;
  duration: number;
  sample_rate: number;
  bit_depth: number;
}

interface AlbumDetailProps {
  album: {
    album: string;
    artist: string;
    cover_url: string;
    year: number;
    tracks: Track[];
  };
  onBack: () => void;
  playTrack: (track: Track) => void;
}

export default function AlbumDetail({ album, onBack, playTrack }: AlbumDetailProps) {
  const DEFAULT_ART = "/default.jpg";

  const getCoverImage = (path: string | null) => {
    if (!path || path === "" || path === "null") return DEFAULT_ART;
    if (path.startsWith('/default')) return path;
    return convertFileSrc(path);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '40px 60px', color: '#fff', overflowY: 'auto', height: '100%' }}>
      {/* Back Button */}
      <button 
        onClick={onBack}
        style={{ 
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
          color: '#fff', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', 
          marginBottom: '30px', fontSize: '0.85rem', fontWeight: 600, transition: '0.2s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      >
        ← Back
      </button>

      {/* Header Section */}
      <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
        <img 
          src={getCoverImage(album.cover_url)} 
          style={{ width: '280px', height: '280px', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', objectFit: 'cover' }} 
          alt="Album Art"
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_ART; }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.5 }}>Album</span>
          <h1 style={{ fontSize: '3.5rem', margin: '10px 0', fontWeight: 900, lineHeight: 1 }}>{album.album}</h1>
          <h2 style={{ fontSize: '1.4rem', margin: '0 0 25px 0', opacity: 0.8, fontWeight: 500 }}>{album.artist}</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <div style={{ background: '#3b2d5a', color: '#d1b3ff', fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px' }}>Hi-Res</div>
             <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>{album.year} • {album.tracks.length} tracks</span>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', padding: '10px 15px', opacity: 0.3, borderBottom: '1px solid #222', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <span>#</span>
          <span>Title</span>
          <span style={{ textAlign: 'center' }}>Quality</span>
          <span style={{ textAlign: 'right' }}>Time</span>
        </div>

        {album.tracks.map((track, i) => (
          <div 
            key={track.id}
            onDoubleClick={() => playTrack(track)}
            className="track-row"
            style={{ 
              display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', padding: '12px 15px', 
              alignItems: 'center', borderRadius: '6px', cursor: 'default', transition: 'background 0.2s'
            }}
          >
            <span style={{ opacity: 0.4 }}>{i + 1}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{track.title}</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.4 }}>{track.artist}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ border: '1px solid #3b2d5a', color: '#d1b3ff', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '3px' }}>Hi-Res</div>
            </div>
            <span style={{ textAlign: 'right', opacity: 0.5, fontSize: '0.9rem' }}>{formatTime(track.duration)}</span>
          </div>
        ))}
      </div>

      <style>{`
        .track-row:hover { background: rgba(255,255,255,0.05); }
      `}</style>
    </div>
  );
}
