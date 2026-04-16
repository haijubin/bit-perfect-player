import { useState, useEffect, useMemo } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

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

type ViewMode = "NowPlaying" | "Library" | "YouTube" | "Albums" | "Artists" | "Genres" | "Playlists" | "Trending";
type LibTab = "List View" | "Configuration";
type NowPlayingSubTab = "Lyrics" | "Details";

function App() {
  const [library, setLibrary] = useState<Track[]>([]);
  const [view, setView] = useState<ViewMode>("Library");
  const [libTab, setLibTab] = useState<LibTab>("List View");
  const [nowPlayingTab, setNowPlayingTab] = useState<NowPlayingSubTab>("Lyrics");
  
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [libraryPaths, setLibraryPaths] = useState<string[]>([]);

  // Sub-navigation states for Detail Views
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  // LIFECYCLE: Load everything on boot
  useEffect(() => {
    loadLibrary();
    loadPaths(); // <--- CRITICAL: Fetch persisted paths from DB
    
    const unlisten = listen<number>("progress", (event) => {
      setProgress(event.payload);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  // Reset sub-selections when changing main sidebar view
  useEffect(() => {
    setSelectedAlbum(null);
    setSelectedArtist(null);
  }, [view]);

  const loadLibrary = async () => {
    try {
      const tracks = await invoke<Track[]>("get_library");
      setLibrary(tracks || []);
    } catch (err) { console.error(err); }
  };

  // NEW: Fetch paths from the Rust backend
  const loadPaths = async () => {
    try {
      const paths = await invoke<string[]>("get_library_paths");
      setLibraryPaths(paths || []);
    } catch (err) {
      console.error("Could not load library paths:", err);
    }
  };

  const handleRescan = async () => {
    setStatus("Rescanning...");
    for (const path of libraryPaths) {
      await invoke("scan_music_folder", { folderPath: path });
    }
    await loadLibrary();
    setStatus(`${library.length} tracks updated`);
  };

  const handleAddPath = async () => {
    try {
      const selected = await open({ directory: true });
      if (selected && !libraryPaths.includes(selected as string)) {
        setStatus("Scanning new path...");
        await invoke("scan_music_folder", { folderPath: selected as string });
        await loadPaths(); // <--- Refresh list from DB
        await loadLibrary();
        setStatus("Library updated");
      }
    } catch (err) { setStatus("Error adding path"); }
  };

  const handleRemovePath = async (pathToRemove: string) => {
    setStatus(`Removing ${pathToRemove}...`);
    try {
      await invoke("remove_music_path", { folderPath: pathToRemove });
      await loadPaths(); // <--- Refresh list from DB
      await loadLibrary();
      setStatus("Path removed and library cleaned");
    } catch (err) {
      console.error(err);
      setStatus("Error removing path");
    }
  };

  const playTrack = async (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    await invoke("start_bit_perfect_stream", { filePath: track.file_path });
  };

  const togglePlayback = async () => {
    try {
      setIsPlaying(!isPlaying);
      await invoke("toggle_playback");
    } catch (err) { setIsPlaying(isPlaying); }
  };

  const handleSkip = (forward: boolean) => {
    if (!currentTrack || library.length === 0) return;
    const currentIndex = library.findIndex(t => t.id === currentTrack.id);
    let nextIndex = forward 
      ? (currentIndex + 1) % library.length 
      : (currentIndex - 1 + library.length) % library.length;
    playTrack(library[nextIndex]);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Data helpers
  const albumGrid = useMemo(() => {
    const albums: Record<string, Track[]> = {};
    library.forEach(t => {
      if (!albums[t.album]) albums[t.album] = [];
      albums[t.album].push(t);
    });
    return Object.entries(albums).map(([name, tracks]) => ({
      album: name,
      artist: tracks[0].artist,
      cover_url: tracks[0].cover_url,
      year: tracks[0].year,
      tracks: tracks
    }));
  }, [library]);

  const artistGrid = useMemo(() => {
    const artists: Record<string, Track[]> = {};
    library.forEach(t => {
      if (!artists[t.artist]) artists[t.artist] = [];
      artists[t.artist].push(t);
    });
    return Object.entries(artists).map(([name, tracks]) => ({
      name,
      cover: tracks[0].cover_url,
      count: tracks.length
    }));
  }, [library]);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#000', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside className="col-nav" style={{ display: 'flex', flexDirection: 'column', width: '260px', borderRight: '1px solid #111', flexShrink: 0, backgroundColor: '#000' }}>
        <div className="brand" style={{ padding: '30px 25px', fontSize: '1.4rem', fontWeight: 900, color: '#1db954', letterSpacing: '2px' }}>MAESTRO</div>
        
        <div className="nav-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '0 15px' }}>
          <nav className="nav-group">
            <div className={`nav-item ${view === "NowPlaying" ? "active" : ""}`} onClick={() => setView("NowPlaying")} style={{ marginBottom: '10px', color: view === "NowPlaying" ? "#1db954" : "#fff", cursor: 'pointer', padding: '12px', borderRadius: '8px', fontWeight: 600 }}>Now Playing</div>

            <label style={{ fontSize: '0.65rem', opacity: 0.4, padding: '20px 12px 10px', letterSpacing: '1.5px' }}>SERVICES</label>
            <div className={`nav-item ${view === "Library" ? "active" : ""}`} onClick={() => setView("Library")} style={{ cursor: 'pointer', padding: '12px', opacity: view === "Library" ? 1 : 0.6 }}>Local Library</div>
            <div className={`nav-item ${view === "YouTube" ? "active" : ""}`} onClick={() => setView("YouTube")} style={{ cursor: 'pointer', padding: '12px', opacity: view === "YouTube" ? 1 : 0.6 }}>YouTube Music</div>
          </nav>

          <nav className="nav-group" style={{ marginTop: '20px' }}>
            <label style={{ fontSize: '0.65rem', opacity: 0.4, padding: '10px 12px', letterSpacing: '1.5px' }}>MY LIBRARY</label>
            {["Albums", "Artists", "Genres", "Playlists", "Trending"].map((m) => (
              <div key={m} className={`nav-item ${view === m ? "active" : ""}`} onClick={() => setView(m as ViewMode)} style={{ cursor: 'pointer', padding: '12px', opacity: view === m ? 1 : 0.6 }}>{m}</div>
            ))}
          </nav>
        </div>

        <div className="nav-footer" style={{ padding: '20px', borderTop: '1px solid #111', fontSize: '0.7rem', opacity: 0.5 }}>
          <span style={{ color: '#1db954', marginRight: '8px' }}>●</span> {status}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="col-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        
        {/* VIEW: NOW PLAYING */}
        {view === "NowPlaying" && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '60px', background: 'linear-gradient(180deg, #181818 0%, #000 100%)' }}>
            {currentTrack ? (
              <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: '50px', marginBottom: '60px' }}>
                  <img src={convertFileSrc(currentTrack.cover_url)} style={{ width: '380px', height: '380px', borderRadius: '16px', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ color: '#1db954', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '2px' }}>HI-RES AUDIO</span>
                    <h1 style={{ fontSize: '4.5rem', margin: '15px 0', lineHeight: 1.1, fontWeight: 800 }}>{currentTrack.title}</h1>
                    <h2 style={{ fontSize: '2rem', fontWeight: 400, opacity: 0.7 }}>{currentTrack.artist} — {currentTrack.album}</h2>
                    <div style={{ marginTop: '30px', opacity: 0.4, fontSize: '0.9rem' }}>24-bit / 44.1kHz • {currentTrack.year} • {currentTrack.genre || "Unknown"}</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #222', paddingTop: '40px', marginBottom: '50px' }}>
                  <h3 style={{ fontSize: '0.8rem', opacity: 0.4, letterSpacing: '2px', marginBottom: '20px' }}>ALBUM NOTES</h3>
                  <p style={{ fontSize: '1.3rem', lineHeight: 1.6, opacity: 0.8, maxWidth: '800px' }}>{currentTrack.album} is optimized for bit-perfect delivery. Capturing every nuance of the high-fidelity performance with native dynamic range.</p>
                </div>

                <div style={{ display: 'flex', gap: '40px', borderBottom: '1px solid #222', marginBottom: '30px' }}>
                  {["Lyrics", "Details"].map(t => (
                    <button key={t} onClick={() => setNowPlayingTab(t as any)} style={{ background: 'none', border: 'none', color: nowPlayingTab === t ? '#fff' : '#444', cursor: 'pointer', paddingBottom: '15px', fontSize: '1.1rem', fontWeight: 700, borderBottom: nowPlayingTab === t ? '3px solid #1db954' : 'none' }}>{t}</button>
                  ))}
                </div>
                {nowPlayingTab === "Lyrics" ? <div style={{ fontSize: '2.5rem', fontWeight: 800, opacity: 0.9 }}>[Lyrics synchronization coming soon...]</div> : 
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
                    <div><div style={{ opacity: 0.4, fontSize: '0.7rem', letterSpacing: '1px' }}>FORMAT</div><div style={{ fontSize: '1.2rem', marginTop: '5px' }}>FLAC / Bit-Perfect</div></div>
                    <div><div style={{ opacity: 0.4, fontSize: '0.7rem', letterSpacing: '1px' }}>YEAR</div><div style={{ fontSize: '1.2rem', marginTop: '5px' }}>{currentTrack.year}</div></div>
                    <div><div style={{ opacity: 0.4, fontSize: '0.7rem', letterSpacing: '1px' }}>GENRE</div><div style={{ fontSize: '1.2rem', marginTop: '5px' }}>{currentTrack.genre || "Unknown"}</div></div>
                  </div>
                }
              </div>
            ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>Ready to Play</div>}
          </div>
        )}

        {/* VIEW: ALBUMS (With Drill-down) */}
        {view === "Albums" && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
            {!selectedAlbum ? (
              <>
                <h1 style={{ marginBottom: '30px', fontSize: '2rem' }}>Albums</h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '40px' }}>
                  {albumGrid.map(a => (
                    <div key={a.album} onClick={() => setSelectedAlbum(a.album)} style={{ cursor: 'pointer' }}>
                      <img src={convertFileSrc(a.cover_url)} style={{ width: '100%', aspectRatio: '1/1', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                      <div style={{ marginTop: '15px', fontWeight: 'bold' }}>{a.album}</div>
                      <div style={{ opacity: 0.5, fontSize: '0.85rem' }}>{a.artist}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ maxWidth: '1000px' }}>
                <button onClick={() => setSelectedAlbum(null)} style={{ background: '#222', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer', marginBottom: '30px' }}>〈</button>
                <div style={{ display: 'flex', gap: '40px', marginBottom: '50px' }}>
                   <img src={convertFileSrc(albumGrid.find(a => a.album === selectedAlbum)?.cover_url || "")} style={{ width: '280px', height: '280px', borderRadius: '12px' }} />
                   <div>
                     <span style={{ color: '#1db954', fontSize: '0.8rem', fontWeight: 800 }}>ALBUM</span>
                     <h1 style={{ fontSize: '3.5rem', margin: '10px 0' }}>{selectedAlbum}</h1>
                     <p style={{ fontSize: '1.2rem', opacity: 0.6 }}>{albumGrid.find(a => a.album === selectedAlbum)?.artist}</p>
                     <div style={{ marginTop: '20px', display: 'flex', gap: '15px', fontSize: '0.8rem', opacity: 0.4 }}>
                        <span style={{ border: '1px solid #fff', padding: '2px 8px', borderRadius: '4px' }}>Hi-Res</span>
                        <span>{albumGrid.find(a => a.album === selectedAlbum)?.tracks.length} tracks</span>
                        <span>{albumGrid.find(a => a.album === selectedAlbum)?.year}</span>
                     </div>
                   </div>
                </div>
                <div style={{ borderTop: '1px solid #222' }}>
                  {library.filter(t => t.album === selectedAlbum).map((track, idx) => (
                    <div key={track.id} onDoubleClick={() => playTrack(track)} style={{ display: 'flex', alignItems: 'center', padding: '15px 10px', borderBottom: '1px solid #111', cursor: 'pointer' }}>
                      <span style={{ width: '40px', opacity: 0.3 }}>{idx + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{track.title}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{track.artist}</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', border: '1px solid #1db954', color: '#1db954', padding: '1px 6px', borderRadius: '4px', marginRight: '20px' }}>Hi-Res</span>
                      <span style={{ opacity: 0.4, width: '50px' }}>{formatTime(track.duration)}</span>
                      <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem' }}>▶</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: ARTISTS (With Drill-down) */}
        {view === "Artists" && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
            {!selectedArtist ? (
              <>
                <h1 style={{ marginBottom: '30px' }}>Artists</h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '40px' }}>
                  {artistGrid.map(a => (
                    <div key={a.name} onClick={() => setSelectedArtist(a.name)} style={{ textAlign: 'center', cursor: 'pointer' }}>
                      <img src={convertFileSrc(a.cover)} style={{ width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                      <div style={{ marginTop: '15px', fontWeight: 'bold' }}>{a.name}</div>
                      <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>{a.count} Tracks</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div>
                <button onClick={() => setSelectedArtist(null)} style={{ background: '#222', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer', marginBottom: '30px' }}>〈</button>
                <h1 style={{ fontSize: '4.5rem', fontWeight: 800, marginBottom: '40px' }}>{selectedArtist}</h1>
                <h3 style={{ opacity: 0.4, letterSpacing: '2px', marginBottom: '20px' }}>ALBUMS</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '30px' }}>
                  {albumGrid.filter(a => a.artist === selectedArtist).map(alb => (
                    <div key={alb.album} onClick={() => { setSelectedAlbum(alb.album); setView("Albums"); }} style={{ cursor: 'pointer' }}>
                      <img src={convertFileSrc(alb.cover_url)} style={{ width: '100%', borderRadius: '12px' }} />
                      <div style={{ marginTop: '15px', fontWeight: 'bold' }}>{alb.album}</div>
                      <div style={{ opacity: 0.5 }}>{alb.year}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: LIBRARY (Standard List/Config) */}
        {view === "Library" && (
          <>
            <header style={{ display: 'flex', gap: '30px', padding: '20px 40px', borderBottom: '1px solid #111' }}>
              {["List View", "Configuration"].map(t => (
                <button key={t} onClick={() => setLibTab(t as LibTab)} style={{ background: 'none', border: 'none', color: libTab === t ? '#1db954' : '#555', cursor: 'pointer', fontWeight: 800, borderBottom: libTab === t ? '2px solid #1db954' : 'none', paddingBottom: '10px' }}>{t}</button>
              ))}
            </header>
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
              {libTab === "Configuration" ? (
                <div style={{ maxWidth: '800px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div><h2>Library Paths</h2><p style={{ opacity: 0.5 }}>Directories scanned for high-end audio.</p></div>
                    <button onClick={handleRescan} style={{ background: 'none', border: '1px solid #1db954', color: '#1db954', padding: '10px 25px', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold' }}>↻ Rescan All</button>
                  </div>
                  {libraryPaths.map(p => (
                    <div key={p} style={{ backgroundColor: '#080808', padding: '20px', borderRadius: '12px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', border: '1px solid #111' }}>
                      <code style={{ color: '#1db954' }}>{p}</code>
                      <button onClick={() => handleRemovePath(p)} style={{ color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                    </div>
                  ))}
                  <button onClick={handleAddPath} style={{ marginTop: '20px', padding: '15px 35px', borderRadius: '30px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>+ Add Path</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '35px' }}>
                  {albumGrid.map(a => (
                    <div key={a.album} onDoubleClick={() => playTrack(a.tracks[0])} style={{ cursor: 'pointer' }}>
                      <img src={convertFileSrc(a.cover_url)} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                      <div style={{ fontWeight: 'bold', marginTop: '12px' }}>{a.album}</div>
                      <div style={{ opacity: 0.5, fontSize: '0.85rem' }}>{a.artist}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* REDESIGNED PLAYBAR */}
        <footer style={{ height: '95px', backgroundColor: '#050505', borderTop: '1px solid #111', display: 'flex', alignItems: 'center', padding: '0 25px', justifyContent: 'space-between', zIndex: 10 }}>
          {/* Left: Metadata */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '300px' }}>
             <div style={{ width: '52px', height: '52px', background: '#111', borderRadius: '6px', overflow: 'hidden' }}>
               {currentTrack && <img src={convertFileSrc(currentTrack.cover_url)} style={{ width: '100%' }} />}
             </div>
             <div>
               <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{currentTrack?.title || "Maestro"}</div>
               <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{currentTrack?.artist || "Ready"}</div>
             </div>
          </div>

          {/* Center: Controls */}
          <div style={{ flex: 1, maxWidth: '650px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '8px' }}>
               <button onClick={() => handleSkip(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>⏮</button>
               <button onClick={togglePlayback} style={{ background: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <span style={{ color: '#000', fontSize: '1.2rem' }}>{isPlaying ? "Ⅱ" : "▶"}</span>
               </button>
               <button onClick={() => handleSkip(true)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>⏭</button>
               <button style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.4, cursor: 'pointer' }}>≡</button>
            </div>
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '15px' }}>
               <span style={{ fontSize: '0.7rem', opacity: 0.4, width: '35px', textAlign: 'right' }}>{formatTime(progress)}</span>
               <div style={{ flex: 1, height: '4px', backgroundColor: '#222', borderRadius: '2px', position: 'relative' }}>
                  <div style={{ width: `${(progress / (currentTrack?.duration || 1)) * 100}%`, height: '100%', backgroundColor: '#fff', borderRadius: '2px' }} />
               </div>
               <span style={{ fontSize: '0.7rem', opacity: 0.4, width: '35px' }}>-{formatTime((currentTrack?.duration || 0) - progress)}</span>
            </div>
          </div>

          {/* Right: Audio Info / Volume */}
          <div style={{ width: '300px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
             <div style={{ width: '35px', height: '35px', background: '#111', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎩</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>🔊</span>
                <span style={{ fontWeight: 700 }}>50</span>
             </div>
             <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', opacity: 0.4, letterSpacing: '1px' }}>SYSTEM OUTPUT</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>This Computer</div>
             </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
