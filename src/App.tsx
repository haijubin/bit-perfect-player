import { useState, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import Library from "./pages/Library";
import NowPlaying from "./pages/NowPlaying";
import Albums from "./pages/Albums";
import YouTube from "./pages/YouTube";
import Artists from "./pages/Artists"; // Added Import
import { useAudioPlayer, Track } from "./hooks/useAudioPlayer";

export type ViewMode = "NowPlaying" | "Library" | "YouTube" | "Albums" | "Artists" | "Genres" | "Playlists" | "Trending";

// Tab Types
export type LibTab = "Album View" | "List View" | "Paths"; 

export type NowPlayingSubTab = "Lyrics" | "Details";

function App() {
  const {
    library, 
    currentTrack, 
    progress, 
    isPlaying, 
    status, 
    libraryPaths,
    rgEnabled, 
    toggleRg,
    handleRescan, 
    handleAddPath, 
    handleRemovePath, 
    playTrack, 
    togglePlayback, 
    handleSkip,
    handleSeek 
  } = useAudioPlayer();

  const [view, setView] = useState<ViewMode>("Library");
  const [libTab, setLibTab] = useState<LibTab>("Album View"); 
  const [nowPlayingTab, setNowPlayingTab] = useState<NowPlayingSubTab>("Lyrics");
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  // Helper to format seconds into M:SS
  const formatTime = (s: number) => {
    if (isNaN(s)) return "0:00";
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Memoized album grouping for performance
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
      tracks
    }));
  }, [library]);

  return (
    <div className="app-container" style={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw', 
      overflow: 'hidden', 
      backgroundColor: '#000', 
      color: '#fff',
      fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
    }}>
      <Sidebar view={view} setView={setView} status={status} />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {/* 1. Library View */}
          {view === "Library" && (
            <Library 
              libTab={libTab} 
              setLibTab={setLibTab} 
              albumGrid={albumGrid}
              library={library} 
              libraryPaths={libraryPaths} 
              handleRescan={handleRescan}
              handleAddPath={handleAddPath} 
              handleRemovePath={handleRemovePath}
              playTrack={playTrack} 
              setSelectedAlbum={setSelectedAlbum} 
              setView={setView}
            />
          )}

          {/* 2. Now Playing View */}
          {view === "NowPlaying" && (
            <NowPlaying 
              currentTrack={currentTrack} 
              nowPlayingTab={nowPlayingTab} 
              setNowPlayingTab={setNowPlayingTab} 
            />
          )}

          {/* 3. Album Detail View */}
          {view === "Albums" && (
            <Albums 
              selectedAlbum={selectedAlbum} 
              albumGrid={albumGrid} 
              playTrack={playTrack} 
            />
          )}

          {/* 4. Artist View */}
          {view === "Artists" && (
            <Artists 
              albumGrid={albumGrid} 
              onSelectAlbum={(albumName) => {
                setSelectedAlbum(albumName);
                setView("Albums");
              }} 
            />
          )}

          {/* 5. YouTube View */}
          {view === "YouTube" && <YouTube />}

          {/* Placeholders for remaining features */}
          {["Genres", "Playlists", "Trending"].includes(view) && (
            <div style={{ padding: '60px', opacity: 0.5 }}>
              <h2>{view}</h2>
              <p>Coming Soon</p>
            </div>
          )}
        </div>

        <PlayerBar 
          currentTrack={currentTrack} 
          isPlaying={isPlaying} 
          progress={progress}
          rgEnabled={rgEnabled}
          toggleRg={toggleRg}
          togglePlayback={togglePlayback} 
          handleSkip={handleSkip} 
          handleSeek={handleSeek} 
          formatTime={formatTime}
        />
      </main>
    </div>
  );
}

export default App;
