import { convertFileSrc } from "@tauri-apps/api/core";

interface AlbumsProps {
  selectedAlbum: string | null;
  albumGrid: any[];
  playTrack: (track: any) => void;
}

export default function Albums({ selectedAlbum, albumGrid, playTrack }: AlbumsProps) {
  const albumData = albumGrid.find(a => a.album === selectedAlbum);
  
  // This matches what you are now saving in Rust/DB
  const DEFAULT_ART = "/default.jpg";

  if (!albumData) {
    return (
      <div className="content-area" style={{ padding: '40px', opacity: 0.5 }}>
        Select an album from the library to view tracks.
      </div>
    );
  }

  // Updated Helper: Detects if path is the public asset or a local file
  const getCoverImage = (path: string | null) => {
    if (!path || path === "" || path === "null") {
      return DEFAULT_ART;
    }
    
    // If it starts with '/', it's our public/default.jpg asset
    if (path.startsWith('/default')) {
      return path;
    }

    // Otherwise, it's a local system path (/home/papas/...) that needs conversion
    return convertFileSrc(path);
  };

  return (
    <div className="content-area" style={{ padding: '40px 60px' }}>
      <div style={{ display: 'flex', gap: '40px', marginBottom: '40px', alignItems: 'flex-end' }}>
        <img 
          key={albumData.album} // Force re-render when switching albums
          src={getCoverImage(albumData.cover_url)} 
          alt={albumData.album}
          style={{ 
            width: '250px', 
            height: '250px', 
            borderRadius: '12px', 
            objectFit: 'cover',
            backgroundColor: '#111',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }} 
          /* Safety net: if a file path is in DB but the file was deleted from disk */
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.endsWith(DEFAULT_ART)) {
              target.src = DEFAULT_ART;
            }
          }}
        />
        <div>
          <p style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 900, marginBottom: '8px', letterSpacing: '1px', color: '#1db954' }}>Album</p>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0 0 10px 0', lineHeight: 1 }}>{albumData.album}</h1>
          <h2 style={{ fontSize: '1.5rem', opacity: 0.7, margin: 0 }}>{albumData.artist}</h2>
        </div>
      </div>

      <div className="tracklist" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', padding: '10px', borderBottom: '1px solid #222', opacity: 0.4, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <span style={{ width: '40px' }}>#</span>
          <span>Title</span>
        </div>

        {albumData.tracks && albumData.tracks.map((track: any, i: number) => (
          <div 
            key={track.id || i} 
            onDoubleClick={() => playTrack(track)}
            style={{ 
              padding: '12px 10px', 
              borderBottom: '1px solid #111', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              gap: '20px' 
            }}
          >
            <span style={{ width: '20px', opacity: 0.3, textAlign: 'center' }}>{i + 1}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 500 }}>{track.title}</span>
              <span style={{ fontSize: '0.85rem', opacity: 0.4 }}>{albumData.artist}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
