import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

export interface Track {
  id: number;
  file_path: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  duration: number;
  cover_url: string;
  replay_gain: number | null;
  genre?: string;
  sample_rate: number | null;
  bit_depth: number | null;
  channels: number | null;
}

export function useAudioPlayer() {
  const [library, setLibrary] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [libraryPaths, setLibraryPaths] = useState<string[]>([]);
  
  // New State for Replay Gain Toggle
  const [rgEnabled, setRgEnabled] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      await loadLibrary();
      const paths = await loadPaths();
      if (paths && paths.length > 0) {
        setStatus("Syncing library...");
        for (const path of paths) {
          try {
            await invoke("scan_music_folder", { folderPath: path });
          } catch (e) { console.error("Scan failed", e); }
        }
        await loadLibrary();
        setStatus("Library Synced");
      }
    };
    initApp();

    const unlisten = listen<number>("progress", (event) => {
      setProgress(event.payload);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  const loadLibrary = async () => {
    try {
      const tracks = await invoke<Track[]>("get_library");
      setLibrary(tracks || []);
    } catch (err) { console.error(err); }
  };

  const loadPaths = async () => {
    try {
      const paths = await invoke<string[]>("get_library_paths");
      setLibraryPaths(paths || []);
      return paths;
    } catch (err) { console.error(err); return []; }
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
        setStatus("Scanning...");
        await invoke("scan_music_folder", { folderPath: selected as string });
        await loadPaths();
        await loadLibrary();
        setStatus("Updated");
      }
    } catch (err) { setStatus("Error adding path"); }
  };

  const handleRemovePath = async (pathToRemove: string) => {
    try {
      await invoke("remove_music_path", { folderPath: pathToRemove });
      await loadPaths();
      await loadLibrary();
      setStatus("Removed");
    } catch (err) { setStatus("Error removing path"); }
  };

  const toggleRg = () => setRgEnabled(!rgEnabled);

  const playTrack = async (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    // Send gain only if both the global toggle is ON and metadata exists
    await invoke("start_bit_perfect_stream", { 
      filePath: track.file_path,
      replayGain: rgEnabled ? track.replay_gain : null 
    });
  };

  const togglePlayback = async () => {
    try {
      const newState = !isPlaying;
      setIsPlaying(newState);
      await invoke("toggle_playback");
    } catch (err) { setIsPlaying(isPlaying); }
  };

  const handleSkip = (forward: string) => {
    if (!currentTrack || library.length === 0) return;
    const currentIndex = library.findIndex(t => t.id === currentTrack.id);
    let nextIndex = forward 
      ? (currentIndex + 1) % library.length 
      : (currentIndex - 1 + library.length) % library.length;
    playTrack(library[nextIndex]);
  };

  const handleSeek = async (timeS: number) => {
    try {
      await invoke("seek_track", { timeS });
    } catch (err) {
      console.error("Seek failed:", err);
    }
  };

  return {
    library, currentTrack, progress, isPlaying, status, libraryPaths,
    rgEnabled, toggleRg, // Exporting new RG controls
    handleRescan, handleAddPath, handleRemovePath, playTrack, togglePlayback, handleSkip, handleSeek
  };
}
