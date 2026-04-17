import { convertFileSrc } from "@tauri-apps/api/core";

interface AlbumsProps {
  selectedAlbum: string | null;
  albumGrid: any[];
  playTrack: (track: any) => void;
}

export default function Albums({ selectedAlbum, albumGrid, playTrack }: AlbumsProps) {
  const albumData = albumGrid.find(a => a.album === selectedAlbum);

  if (!albumData) return <div style={{ padding: '40px' }}>Select an album from the library.</div>;

  return (
    <div style={{ padding: '40px' }}>
      <div style={{ display: 'flex', gap: '30px', marginBottom: '40px' }}>
        <img src={convertFileSrc(albumData.cover_url)} style={{ width: '200px', borderRadius: '10px' }} />
        <div>
          <h1 style={{ fontSize: '3rem', margin: 0 }}>{albumData.album}</h1>
          <h2 style={{ opacity: 0.6 }}>{albumData.artist}</h2>
        </div>
      </div>
      <div className="tracklist">
        {albumData.tracks.map((track: any, i: number) => (
          <div 
            key={track.id} 
            onDoubleClick={() => playTrack(track)}
            style={{ padding: '10px', borderBottom: '1px solid #111', cursor: 'pointer', display: 'flex', gap: '20px' }}
          >
            <span style={{ opacity: 0.3 }}>{i + 1}</span>
            <span>{track.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
