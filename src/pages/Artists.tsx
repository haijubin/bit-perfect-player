import { useState, useMemo } from "react";
import ArtistDetail from "./ArtistDetail";

interface ArtistsProps {
  albumGrid: any[];
  onSelectAlbum: (name: string) => void;
}

export default function Artists({ albumGrid, onSelectAlbum }: ArtistsProps) {
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  // Grouping logic: Takes the list of albums and groups them by artist name
  const artistMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    (albumGrid || []).forEach(item => {
      if (!map[item.artist]) map[item.artist] = [];
      map[item.artist].push(item);
    });
    return map;
  }, [albumGrid]);

  const artists = Object.keys(artistMap).sort();

  if (selectedArtist) {
    return (
      <ArtistDetail 
        artistName={selectedArtist} 
        albums={artistMap[selectedArtist]} 
        onBack={() => setSelectedArtist(null)}
        onAlbumClick={onSelectAlbum}
      />
    );
  }

  return (
    <div style={{ padding: '40px' }}>
      <h2 style={{ marginBottom: '30px' }}>Artists</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '30px' }}>
        {artists.map(name => (
          <div key={name} onClick={() => setSelectedArtist(name)} style={{ textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ 
              width: '100%', aspectRatio: '1/1', borderRadius: '50%', 
              backgroundColor: '#111', overflow: 'hidden', marginBottom: '10px',
              border: '1px solid #222'
            }}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`} style={{ width: '100%' }} />
            </div>
            <div style={{ fontWeight: 'bold' }}>{name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{artistMap[name].length} Albums</div>
          </div>
        ))}
      </div>
    </div>
  );
}
