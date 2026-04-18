import { convertFileSrc } from "@tauri-apps/api/core";

interface ArtistDetailProps {
  artistName: string;
  albums: any[];
  onBack: () => void;
  onAlbumClick: (albumName: string) => void;
}

export default function ArtistDetail({ artistName, albums, onBack, onAlbumClick }: ArtistDetailProps) {
  // UI Placeholder for the artist image
  const PLACEHOLDER = `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&size=300&background=222&color=fff`;

  return (
    <div style={{ padding: '30px 50px', color: '#fff' }}>
      <button 
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: '#1db954', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}
      >
        ← BACK TO ARTISTS
      </button>

      {/* Artist Header - Matching your screenshot */}
      <div style={{ 
        display: 'flex', gap: '30px', alignItems: 'flex-end', 
        padding: '40px', background: 'linear-gradient(transparent, rgba(0,0,0,0.5))', 
        borderRadius: '15px', marginBottom: '30px', border: '1px solid #222' 
      }}>
        <img src={PLACEHOLDER} style={{ width: '180px', height: '180px', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
        <div>
          <h1 style={{ fontSize: '4rem', margin: 0, fontWeight: 900 }}>{artistName}</h1>
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px', opacity: 0.6, fontSize: '0.9rem' }}>
            <span><strong>Born:</strong> Placeholder City</span>
            <span><strong>Genre:</strong> Various</span>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '20px', opacity: 0.5 }}>ALBUMS</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '25px' }}>
        {albums.map((album, idx) => (
          <div key={idx} onClick={() => onAlbumClick(album.album)} style={{ cursor: 'pointer' }}>
            <img 
              src={album.cover_url ? convertFileSrc(album.cover_url) : "/default_album.png"} 
              style={{ width: '100%', aspectRatio: '1/1', borderRadius: '8px', objectFit: 'cover' }} 
            />
            <div style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '0.9rem' }}>{album.album}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{album.year || 'Unknown Year'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
