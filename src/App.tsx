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

  useEffect(() => {
    loadLibrary();
    const unlisten = listen<number>("progress", (event) => {
      setProgress(event.payload);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  const loadLibrary = async () => {
    try {
      const tracks = await invoke<Track[]>("get_library");
      setLibrary(tracks);
    } catch (err) { console.error(err); }
  };

  const handleRescan = async () => {
    setStatus("Rescanning...");
    // Manually trigger a scan of all known paths
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
        setLibraryPaths(prev => [...prev, selected as string]);
        setStatus("Scanning new path...");
        // Automatically trigger scan upon adding
        await invoke("scan_music_folder", { folderPath: selected });
        await loadLibrary();
        setStatus("Library updated");
      }
    } catch (err) { setStatus("Error adding path"); }
  };

  // Logic to remove path and purge associated tracks from database
  const handleRemovePath = async (pathToRemove: string) => {
    setStatus(`Removing ${pathToRemove}...`);
    try {
      // 1. Tell backend to delete tracks belonging to this path
      await invoke("remove_music_path", { folderPath: pathToRemove });
      
      // 2. Update local state list of paths
      setLibraryPaths(prev => prev.filter(p => p !== pathToRemove));
      
      // 3. Refresh the library from the database
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

  const albumGrid = useMemo(() => {
    const albums: Record<string, Track> = {};
    library.forEach(t => {
      if (!albums[t.album]) albums[t.album] = t;
    });
    return Object.values(albums);
  }, [library]);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#000', color: '#fff' }}>
      
      {/* SIDEBAR */}
      <aside className="col-nav" style={{ display: 'flex', flexDirection: 'column', width: 'clamp(200px, 15vw, 300px)', borderRight: '1px solid #222', flexShrink: 0 }}>
        <div className="brand" style={{ padding: '20px', fontSize: '1.2rem', fontWeight: 'bold', color: '#1db954' }}>MAESTRO</div>
        
        <div className="nav-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          <nav className="nav-group">
            <div className={`nav-item ${view === "NowPlaying" ? "active" : ""}`} onClick={() => setView("NowPlaying")} style={{ marginBottom: '15px', color: view === "NowPlaying" ? "#1db954" : "#fff", cursor: 'pointer', padding: '10px' }}>
               Now Playing
            </div>

            <label style={{ fontSize: '0.7rem', opacity: 0.5, padding: '10px' }}>SERVICES</label>
            <div className={`nav-item ${view === "Library" ? "active" : ""}`} onClick={() => setView("Library")} style={{ cursor: 'pointer', padding: '10px' }}>Local Library</div>
            <div className={`nav-item ${view === "YouTube" ? "active" : ""}`} onClick={() => setView("YouTube")} style={{ cursor: 'pointer', padding: '10px' }}>YouTube Music</div>
          </nav>

          <nav className="nav-group" style={{ marginTop: '20px' }}>
            <label style={{ fontSize: '0.7rem', opacity: 0.5, padding: '10px' }}>MY LIBRARY</label>
            {["Albums", "Artists", "Genres", "Playlists", "Trending"].map((m) => (
              <div key={m} className={`nav-item ${view === m ? "active" : ""}`} onClick={() => setView(m as ViewMode)} style={{ cursor: 'pointer', padding: '10px' }}>
                {m}
              </div>
            ))}
          </nav>
        </div>

        <div className="nav-footer" style={{ padding: '20px', borderTop: '1px solid #111' }}>
          <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#1db954' }}>●</span> {status}
          </div>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="col-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* VIEW: NOW PLAYING */}
        {view === "NowPlaying" && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(20px, 5vw, 60px)', background: 'linear-gradient(180deg, #121212 0%, #000 100%)' }}>
            {currentTrack ? (
              <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', marginBottom: '40px' }}>
                  <img src={convertFileSrc(currentTrack.cover_url)} style={{ width: 'clamp(200px, 30vw, 350px)', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} />
                  <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ color: '#1db954', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '1px' }}>HI-RES AUDIO</span>
                    <h1 style={{ fontSize: '4rem', margin: '10px 0', lineHeight: 1.1 }}>{currentTrack.title}</h1>
                    <h2 style={{ fontSize: '1.8rem', opacity: 0.8, fontWeight: 'normal' }}>{currentTrack.artist} — {currentTrack.album}</h2>
                    <div style={{ marginTop: '20px', opacity: 0.5, fontSize: '0.9rem' }}>
                      24-bit / 44.1kHz • {currentTrack.year}
                    </div>
                  </div>
                </div>

                <section style={{ marginBottom: '50px', borderTop: '1px solid #222', paddingTop: '30px' }}>
                  <h3 style={{ fontSize: '0.9rem', opacity: 0.4, letterSpacing: '2px', marginBottom: '15px' }}>ALBUM NOTES</h3>
                  <p style={{ fontSize: '1.2rem', lineHeight: 1.7, opacity: 0.8 }}>
                    {currentTrack.album} is optimized for bit-perfect delivery. The production provides a hauntingly clear vocal presence and natively high dynamic range.
                  </p>
                </section>

                <header style={{ display: 'flex', gap: '40px', borderBottom: '1px solid #222', marginBottom: '30px' }}>
                  {["Lyrics", "Details"].map(t => (
                    <button key={t} onClick={() => setNowPlayingTab(t as any)} style={{ 
                      background: 'none', border: 'none', color: nowPlayingTab === t ? '#fff' : '#555', 
                      cursor: 'pointer', paddingBottom: '15px', fontSize: '1rem', fontWeight: 'bold',
                      borderBottom: nowPlayingTab === t ? '2px solid #1db954' : 'none' 
                    }}>{t}</button>
                  ))}
                </header>

                {nowPlayingTab === "Lyrics" ? (
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', lineHeight: 1.5, opacity: 0.9 }}>
                    [Lyrics synchronization coming soon...]
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '40px' }}>
                    <div><div style={{ opacity: 0.4, fontSize: '0.75rem', letterSpacing: '1px' }}>FORMAT</div><div style={{ fontSize: '1.1rem' }}>FLAC / Bit-Perfect</div></div>
                    <div><div style={{ opacity: 0.4, fontSize: '0.75rem', letterSpacing: '1px' }}>SAMPLE RATE</div><div style={{ fontSize: '1.1rem' }}>44.1 kHz</div></div>
                    <div><div style={{ opacity: 0.4, fontSize: '0.75rem', letterSpacing: '1px' }}>BIT DEPTH</div><div style={{ fontSize: '1.1rem' }}>24-bit</div></div>
                    <div><div style={{ opacity: 0.4, fontSize: '0.75rem', letterSpacing: '1px' }}>YEAR</div><div style={{ fontSize: '1.1rem' }}>{currentTrack.year || "Unknown"}</div></div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                Select a track to start listening
              </div>
            )}
          </div>
        )}

        {/* VIEW: LIBRARY */}
        {view === "Library" && (
          <>
            <header style={{ display: 'flex', gap: '25px', padding: '15px 30px', borderBottom: '1px solid #111' }}>
              {["List View", "Configuration"].map(t => (
                <button key={t} onClick={() => setLibTab(t as LibTab)} style={{ background: 'none', border: 'none', color: libTab === t ? '#1db954' : '#555', cursor: 'pointer', fontWeight: 'bold', borderBottom: libTab === t ? '2px solid #1db954' : 'none', paddingBottom: '5px' }}>{t}</button>
              ))}
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
              {libTab === "Configuration" ? (
                <div style={{ maxWidth: '800px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                      <h2 style={{ marginBottom: '5px' }}>Library Paths</h2>
                      <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>Folders scanned for high-fidelity audio.</p>
                    </div>
                    <button onClick={handleRescan} style={{ background: 'none', border: '1px solid #1db954', color: '#1db954', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>↻ Rescan Library</button>
                  </div>
                  
                  <div className="path-list">
                    {libraryPaths.map(p => (
                      <div key={p} style={{ backgroundColor: '#111', padding: '15px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <code style={{ color: '#1db954' }}>{p}</code>
                        <button onClick={() => handleRemovePath(p)} style={{ color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleAddPath} style={{ marginTop: '20px', padding: '12px 25px', borderRadius: '25px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>+ Add Path</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '30px' }}>
                  {albumGrid.map(album => (
                    <div key={album.album} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onDoubleClick={() => playTrack(album)}>
                      <img src={convertFileSrc(album.cover_url)} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.album}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{album.artist}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* PLAYER BAR */}
        <footer className="player-bar" style={{ height: '100px', backgroundColor: '#080808', borderTop: '1px solid #111', display: 'flex', alignItems: 'center', padding: '0 30px' }}>
          <div className="player-left" style={{ flex: '0 1 30%', display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
              <img src={currentTrack?.cover_url ? convertFileSrc(currentTrack.cover_url) : ""} style={{ width: '56px', height: '56px', borderRadius: '4px', objectFit: 'cover' }} />
              <div style={{ overflow: 'hidden' }}>
                 <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack?.title || "Ready"} <span style={{ cursor: 'pointer', color: '#1db954', marginLeft: '8px' }} title="Add to Playlist">+</span></div>
                 <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{currentTrack?.artist || "Maestro Player"}</div>
              </div>
          </div>

          <div className="player-center" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '10px' }}>
              <button style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '1.1rem' }} title="Shuffle">🔀</button>
              <button onClick={() => handleSkip(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>⏮</button>
              <button onClick={togglePlayback} style={{ background: '#fff', color: '#000', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                {isPlaying ? "Ⅱ" : "▶"}
              </button>
              <button onClick={() => handleSkip(true)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>⏭</button>
              <button style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '1.1rem' }} title="Repeat">🔁</button>
            </div>
            <div style={{ width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>{formatTime(progress)}</span>
               <div style={{ flex: 1, height: '4px', backgroundColor: '#222', borderRadius: '2px' }}>
                  <div style={{ width: `${(progress / (currentTrack?.duration || 1)) * 100}%`, height: '100%', backgroundColor: '#1db954', borderRadius: '2px' }}></div>
               </div>
               <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>{formatTime(currentTrack?.duration || 0)}</span>
            </div>
          </div>

          <div className="player-right" style={{ flex: '0 1 30%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
            <button style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.6, cursor: 'pointer', fontSize: '0.85rem' }}>
              🔊 Speaker Output
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
