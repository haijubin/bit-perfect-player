import { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import AlbumDetail from "./AlbumDetail";

interface AlbumsProps {
  selectedAlbum: string | null;
  albumGrid: any[];
  playTrack: (track: any) => void;
}

export default function Albums({ selectedAlbum, albumGrid, playTrack }: AlbumsProps) {
  const [internalSelected, setInternalSelected] = useState<string | null>(selectedAlbum);
  const DEFAULT_ART = "/default.jpg";

  // Sync with prop if it changes from outside (e.g., clicking in Library)
  useEffect(() => {
    setInternalSelected(selectedAlbum);
  }, [selectedAlbum]);

  const getCoverImage = (path: string | null) => {
    if (!path || path === "" || path === "null") return DEFAULT_ART;
    if (path.startsWith('/default')) return path;
    return convertFileSrc(path);
  };

  const albumData = albumGrid.find(a => a.album === internalSelected);

  // VIEW 1: Album Detail View
  if (albumData) {
    return (
      <AlbumDetail 
        album={albumData} 
        onBack={() => setInternalSelected(null)} 
        playTrack={playTrack}
      />
    );
  }

  // VIEW 2: Grid/Thumbnail View
  return (
    <div style={{ padding: '40px 60px', overflowY: 'auto', height: '100%' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '30px' }}>Albums</h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
        gap: '30px' 
      }}>
        {albumGrid.map((group) => (
          <div 
            key={group.album}
            onClick={() => setInternalSelected(group.album)}
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div style={{ 
              width: '100%', 
              aspectRatio: '1/1', 
              borderRadius: '8px', 
              overflow: 'hidden', 
              backgroundColor: '#111', 
              marginBottom: '12px',
              boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
            }}>
              <img 
                src={getCoverImage(group.cover_url)} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt={group.album}
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_ART; }}
              />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {group.album}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{group.artist}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
