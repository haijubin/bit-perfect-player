import { useState, useMemo, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Track } from "../hooks/useAudioPlayer";

interface LibraryProps {
  libTab: "List View" | "Tracks" | "Configuration";
  setLibTab: (tab: "List View" | "Tracks" | "Configuration") => void;
  albumGrid: any[];
  library: Track[];
  libraryPaths: string[];
  handleRescan: () => void;
  handleAddPath: () => void;
  handleRemovePath: (path: string) => void;
  playTrack: (track: Track) => void;
  setSelectedAlbum: (album: string) => void;
  setView: (view: any) => void;
}

type SortKey = "title" | "album" | "artist";

export default function Library({
  libTab, setLibTab, albumGrid, library, libraryPaths,
  handleRescan, handleAddPath, handleRemovePath,
  playTrack, setSelectedAlbum, setView,
}: LibraryProps) {
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([]);

  const sortedTracks = useMemo(() => {
    return [...library].sort((a, b) => {
      const valA = (a[sortKey] || "").toString().toLowerCase();
      const valB = (b[sortKey] || "").toString().toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [library, sortKey, sortOrder]);

  // --- NEW: Keyboard "Select All" Logic ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (libTab === "Tracks" && (e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault(); // Stop browser from highlighting text
        setSelectedTrackIds(sortedTracks.map(t => t.id));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [libTab, sortedTracks]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortOrder("asc"); }
  };

  const toggleSelection = (e: React.MouseEvent, id: number, index: number) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedTrackIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else if (e.shiftKey && selectedTrackIds.length > 0) {
      // Shift-click range selection
      const lastId = selectedTrackIds[selectedTrackIds.length - 1];
      const lastIndex = sortedTracks.findIndex(t => t.id === lastId);
      const start = Math.min(lastIndex, index);
      const end = Math.max(lastIndex, index);
      const rangeIds = sortedTracks.slice(start, end + 1).map(t => t.id);
      setSelectedTrackIds(Array.from(new Set([...selectedTrackIds, ...rangeIds])));
    } else {
      setSelectedTrackIds([id]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedTrackIds.length === 0) return;
    alert(`Menu for ${selectedTrackIds.length} tracks.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#000' }}>
      <header style={{ display: 'flex', gap: '30px', padding: '20px 40px', borderBottom: '1px solid #111', userSelect: 'none' }}>
        {["List View", "Tracks", "Configuration"].map((t) => (
          <button
            key={t}
            onClick={() => setLibTab(t as any)}
            style={{
              background: 'none', border: 'none',
              color: libTab === t ? '#1db954' : '#555',
              cursor: 'pointer', fontWeight: 800,
              borderBottom: libTab === t ? '2px solid #1db954' : 'none',
              paddingBottom: '10px', fontSize: '0.9rem', textTransform: 'uppercase'
            }}
          >
            {t}
          </button>
        ))}
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 40px' }}>
        {libTab === "Configuration" ? (
          <div style={{ maxWidth: '800px' }}>
            <h2>Library Configuration</h2>
            {/* ... keep config logic same ... */}
            <button onClick={handleRescan}>Rescan</button>
            {libraryPaths.map(p => <div key={p}>{p}</div>)}
            <button onClick={handleAddPath}>+ Add Path</button>
          </div>
        ) : libTab === "Tracks" ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', userSelect: 'none' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#000', zIndex: 1 }}>
              <tr style={{ color: '#555', fontSize: '0.75rem', borderBottom: '1px solid #222', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleSort("title")}>
                  Title {sortKey === "title" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleSort("album")}>
                  Album {sortKey === "album" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => handleSort("artist")}>
                  Artist {sortKey === "artist" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
              </tr>
            </thead>
            <tbody onContextMenu={handleContextMenu}>
              {sortedTracks.map((track, index) => (
                <tr 
                  key={track.id}
                  onClick={(e) => toggleSelection(e, track.id, index)}
                  onDoubleClick={() => playTrack(track)}
                  style={{ 
                    backgroundColor: selectedTrackIds.includes(track.id) ? 'rgba(29, 185, 84, 0.2)' : 'transparent',
                    borderBottom: '1px solid #111',
                    fontSize: '0.85rem'
                  }}
                >
                  <td style={{ padding: '12px', color: selectedTrackIds.includes(track.id) ? '#1db954' : '#fff' }}>{track.title}</td>
                  <td style={{ padding: '12px', color: '#888' }}>{track.album}</td>
                  <td style={{ padding: '12px', color: '#888' }}>{track.artist}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '35px' }}>
            {albumGrid.map((a) => (
              <div key={a.album} onClick={() => { setSelectedAlbum(a.album); setView("Albums"); }} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <img src={convertFileSrc(a.cover_url)} style={{ width: '100%', borderRadius: '8px' }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '10px' }}>{a.album}</div>
                <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>{a.artist}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
