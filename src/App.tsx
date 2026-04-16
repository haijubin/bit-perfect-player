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

type ViewMode = "Library" | "YouTube" | "Albums" | "Artists" | "Genres" | "Playlists" | "Trending";
type TabMode = "List" | "Lyrics" | "Details";

function App() {
  const [library, setLibrary] = useState<Track[]>([]);
  const [view, setView] = useState<ViewMode>("Library");
  const [activeTab, setActiveTab] = useState<TabMode>("List");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Idle");

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

  const handleScan = async () => {
    try {
      const selected = await open({ directory: true });
      if (selected) {
        setStatus("Scanning...");
        const tracks = await invoke<Track[]>("scan_music_folder", { folderPath: selected });
        setLibrary(tracks);
        setStatus(`${tracks.length} tracks`);
      }
    } catch (err) { setStatus("Error"); }
  };

  const playTrack = async (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    await invoke("start_bit_perfect_stream", { filePath: track.file_path });
  };

  const togglePlayback = async () => {
    try {
      // Toggle the local state immediately for UI responsiveness
      const newPlayingState = !isPlaying;
      setIsPlaying(newPlayingState);
      // Call backend to play/pause the stream
      await invoke("toggle_playback");
    } catch (err) { 
      console.error("Toggle failed", err);
      setIsPlaying(isPlaying); // Revert if backend fails
    }
  };

  const handleSkip = (forward: boolean) => {
    if (!currentTrack || library.length === 0) return;
    
    const currentIndex = library.findIndex(t => t.id === currentTrack.id);
    let nextIndex;
    
    if (forward) {
      nextIndex = (currentIndex + 1) % library.length;
    } else {
      nextIndex = (currentIndex - 1 + library.length) % library.length;
    }
    
    playTrack(library[nextIndex]);
  };

  const browserItems = useMemo(() => {
    const unique = new Set<string>();
    library.forEach(t => {
      if (view === "Albums") unique.add(t.album);
      if (view === "Artists") unique.add(t.artist);
      if (view === "Genres") unique.add(t.genre || "Unknown");
    });
    return Array.from(unique).sort();
  }, [library, view]);

  const filteredTracks = useMemo(() => {
    if (view === "Library" || view === "YouTube") return library;
    if (!selectedGroup) return library;
    return library.filter(t => {
      if (view === "Albums") return t.album === selectedGroup;
      if (view === "Artists") return t.artist === selectedGroup;
      if (view === "Genres") return t.genre === selectedGroup;
      return true;
    });
  }, [library, view, selectedGroup]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#000', color: '#fff' }}>
      
      {/* SIDEBAR */}
      <aside className="col-nav" style={{ display: 'flex', flexDirection: 'column', width: 'clamp(200px, 15vw, 300px)', borderRight: '1px solid #222', flexShrink: 0 }}>
        <div className="brand" style={{ padding: '20px', fontSize: '1.2rem', fontWeight: 'bold', color: '#1db954' }}>MAESTRO</div>
        
        <div className="nav-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          <nav className="nav-group">
            <label style={{ fontSize: '0.7rem', opacity: 0.5, padding: '10px' }}>SERVICES</label>
            <div className={`nav-item ${view === "Library" ? "active" : ""}`} onClick={() => setView("Library")}>Local Library</div>
            <div className={`nav-item ${view === "YouTube" ? "active" : ""}`} onClick={() => setView("YouTube")}>YouTube Music</div>
          </nav>

          <nav className="nav-group" style={{ marginTop: '20px' }}>
            <label style={{ fontSize: '0.7rem', opacity: 0.5, padding: '10px' }}>MY LIBRARY</label>
            {["Albums", "Artists", "Genres", "Playlists", "Trending"].map((m) => (
              <div key={m} className={`nav-item ${view === m ? "active" : ""}`} onClick={() => { setView(m as ViewMode); setSelectedGroup(null); }}>
                {m}
              </div>
            ))}
          </nav>
        </div>

        <div className="nav-footer" style={{ padding: '20px', borderTop: '1px solid #111' }}>
          <button onClick={handleScan} className="import-btn-bottom" style={{ width: '100%', padding: '8px', borderRadius: '20px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
            + Import Music
          </button>
          <div style={{ marginTop: '10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.6 }}>
            <span style={{ color: '#1db954' }}>●</span> {status}
          </div>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="col-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="main-tabs" style={{ display: 'flex', gap: '20px', padding: '15px 30px', borderBottom: '1px solid #111' }}>
          {["List", "Lyrics", "Details"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as TabMode)} style={{ background: 'none', border: 'none', color: activeTab === tab ? '#fff' : '#555', cursor: 'pointer', fontSize: '0.9rem', borderBottom: activeTab === tab ? '2px solid #1db954' : 'none', paddingBottom: '5px' }}>
              {tab}
            </button>
          ))}
        </header>

        <div className="tab-content" style={{ flex: 1, overflowY: 'auto', padding: 'clamp(10px, 3vw, 40px)' }}>
          {activeTab === "List" && (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {currentTrack && (
                <div className="hero-section" style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(15px, 4vw, 40px)', marginBottom: '40px', alignItems: 'flex-end' }}>
                   <img 
                    src={convertFileSrc(currentTrack.cover_url)} 
                    alt="" 
                    style={{ width: 'clamp(150px, 25vw, 300px)', height: 'clamp(150px, 25vw, 300px)', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 15px 50px rgba(0,0,0,0.8)' }} 
                   />
                   <div className="hero-text" style={{ flex: 1, minWidth: '250px' }}>
                     <span style={{ fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px', opacity: 0.5 }}>ALBUM</span>
                     <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 4rem)', margin: '5px 0', lineHeight: 1 }}>{currentTrack.album}</h1>
                     <p style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.2rem)', opacity: 0.7 }}>{currentTrack.artist} • {currentTrack.title}</p>
                   </div>
                </div>
              )}
              
              <div className="list-table">
                {filteredTracks.map((t, i) => (
                  <div key={t.id} className="table-row" onDoubleClick={() => playTrack(t)} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 80px', padding: '12px 10px', fontSize: '0.9rem', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <span style={{ opacity: 0.3 }}>{i + 1}</span>
                    <span style={{ color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    <span style={{ opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.album}</span>
                    <span style={{ textAlign: 'right', opacity: 0.4, fontSize: '0.8rem' }}>{formatTime(t.duration)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PLAYBAR */}
        <footer className="player-bar" style={{ height: '100px', backgroundColor: '#080808', borderTop: '1px solid #111', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
          <div className="player-left" style={{ flex: '0 1 30%', display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
              <img 
                src={currentTrack?.cover_url ? convertFileSrc(currentTrack.cover_url) : ""} 
                style={{ width: '56px', height: '56px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} 
                alt="" 
              />
              <div style={{ overflow: 'hidden' }}>
                 <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack?.title || "Ready"}</div>
                 <div style={{ fontSize: '0.75rem', opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack?.artist || "Maestro Player"}</div>
              </div>
          </div>

          <div className="player-center" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '10px' }}>
              <button onClick={() => handleSkip(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.7 }}>⏮</button>
              <button onClick={togglePlayback} style={{ background: '#fff', color: '#000', border: 'none', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isPlaying ? "Ⅱ" : "▶"}
              </button>
              <button onClick={() => handleSkip(true)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.7 }}>⏭</button>
            </div>
            <div style={{ width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <span style={{ fontSize: '0.7rem', opacity: 0.4, width: '35px' }}>{formatTime(progress)}</span>
               <div style={{ flex: 1, height: '4px', backgroundColor: '#222', borderRadius: '2px' }}>
                  <div style={{ width: `${(progress / (currentTrack?.duration || 1)) * 100}%`, height: '100%', backgroundColor: '#1db954', borderRadius: '2px' }}></div>
               </div>
               <span style={{ fontSize: '0.7rem', opacity: 0.4, width: '35px' }}>{formatTime(currentTrack?.duration || 0)}</span>
            </div>
          </div>

          <div className="player-right" style={{ flex: '0 1 30%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', opacity: 0.5, fontSize: '0.8rem' }}>
            <span>🔊</span>
            <div style={{ width: '80px', height: '3px', backgroundColor: '#333', borderRadius: '2px' }}>
              <div style={{ width: '70%', height: '100%', backgroundColor: '#fff', borderRadius: '2px' }}></div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
