use walkdir::WalkDir;
use rusqlite::{params, Connection};
use serde::{Serialize, Deserialize};
use std::fs::File;
use tauri::AppHandle;
use tauri_plugin_fs::FsExt; 
use symphonia::core::meta::StandardTagKey;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::probe::Hint;

#[derive(Serialize, Deserialize, Clone)]
pub struct Track {
    pub id: i32,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub year: Option<i32>,
    pub duration: f64,
    pub file_path: String,
    pub cover_url: Option<String>,
    pub replay_gain: Option<f32>,
}

pub fn init_db() -> Connection {
    let conn = Connection::open("library.db").expect("Failed to open database");
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY,
            title TEXT,
            artist TEXT,
            album TEXT,
            year INTEGER,
            duration REAL,
            file_path TEXT UNIQUE,
            cover_url TEXT
        )",
        [],
    ).expect("Failed to create tracks table");

    conn.execute(
        "CREATE TABLE IF NOT EXISTS replay_gain (
            track_id INTEGER PRIMARY KEY,
            track_gain REAL,
            FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
        )",
        [],
    ).expect("Failed to create replay_gain table");

    conn
}

#[tauri::command]
pub fn get_library() -> Result<Vec<Track>, String> {
    let conn = Connection::open("library.db").map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("
        SELECT 
            t.id, t.title, t.artist, t.album, t.year, 
            t.duration, t.file_path, t.cover_url, rg.track_gain 
        FROM tracks t
        LEFT JOIN replay_gain rg ON t.id = rg.track_id
    ").map_err(|e| e.to_string())?;
   
    let tracks = stmt.query_map([], |row| {
        Ok(Track {
            id: row.get(0)?,
            title: row.get(1)?,
            artist: row.get(2)?,
            album: row.get(3)?,
            year: row.get(4)?,
            duration: row.get(5)?,
            file_path: row.get(6)?,
            cover_url: row.get(7)?,
            replay_gain: row.get(8)?, 
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|t| t.ok())
    .collect();

    Ok(tracks)
}

#[tauri::command]
pub async fn scan_music_folder(app: AppHandle, folder_path: String) -> Result<Vec<Track>, String> {
    let conn = crate::modules::database::get_db_connection().map_err(|e| e.to_string())?;

    let _ = conn.execute(
        "INSERT OR IGNORE INTO library_paths (path) VALUES (?1)",
        [&folder_path],
    );
    let scope = app.fs_scope();
    let _ = scope.allow_directory(&folder_path, true);
    
    // Re-init to ensure tables exist
    let conn = init_db();

    for entry in WalkDir::new(&folder_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            let ext = e.path().extension().and_then(|s| s.to_str()).unwrap_or("");
            matches!(ext, "mp3" | "flac" | "wav" | "m4a")
        })
    {
        let path_str = entry.path().to_string_lossy().to_string();
        let mut title = entry.file_name().to_string_lossy().to_string();
        let mut artist = String::from("Unknown Artist");
        let mut album = String::from("Unknown Album");
        let mut year = None;
        let mut duration = 0.0;
        let mut cover_url = None;
        let mut track_gain: Option<f32> = None;

        if let Ok(src) = File::open(entry.path()) {
            let mss = MediaSourceStream::new(Box::new(src), Default::default());
            let hint = Hint::new();
            
            if let Ok(mut probed) = symphonia::default::get_probe().format(&hint, mss, &Default::default(), &Default::default()) {
                if let Some(stream) = probed.format.tracks().iter().next() {
                    if let Some(params) = &stream.codec_params.time_base {
                        let n_frames = stream.codec_params.n_frames.unwrap_or(0);
                        duration = n_frames as f64 * (params.numer as f64 / params.denom as f64);
                    }
                }

                if let Some(metadata) = probed.format.metadata().current() {
                    for tag in metadata.tags() {
                        match tag.std_key {
                            Some(StandardTagKey::TrackTitle) => title = tag.value.to_string(),
                            Some(StandardTagKey::Artist) => artist = tag.value.to_string(),
                            Some(StandardTagKey::Album) => album = tag.value.to_string(),
                            Some(StandardTagKey::Date) => {
                                if let Ok(y) = tag.value.to_string().parse::<i32>() { year = Some(y); }
                            },
                            _ => {
                                // Checking for ReplayGain in the raw keys
                                let key_string = tag.key.to_uppercase();
                                if key_string.contains("REPLAYGAIN_TRACK_GAIN") {
                                    let val_str = tag.value.to_string().replace(" dB", "");
                                    if let Ok(val) = val_str.parse::<f32>() {
                                        track_gain = Some(val);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if let Some(parent) = entry.path().parent() {
            for cover_name in ["folder.jpg", "cover.jpg", "album.jpg", "folder.png"] {
                let cp = parent.join(cover_name);
                if cp.exists() {
                    cover_url = Some(cp.to_string_lossy().to_string());
                    break;
                }
            }
        }

        // Insert track info
        let _ = conn.execute(
            "INSERT OR REPLACE INTO tracks (title, artist, album, year, duration, file_path, cover_url) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![title, artist, album, year, duration, path_str, cover_url],
        );

        // Get track ID and insert gain if found
        let track_id: i32 = conn.last_insert_rowid() as i32;
        if let Some(gain) = track_gain {
            let _ = conn.execute(
                "INSERT OR REPLACE INTO replay_gain (track_id, track_gain) VALUES (?1, ?2)",
                params![track_id, gain],
            );
        }
    }

    get_library()
}

#[tauri::command]
pub fn remove_music_path(folder_path: String) -> Result<(), String> {
    let conn = crate::modules::database::get_db_connection().map_err(|e| e.to_string())?;
    let _ = conn.execute(
        "DELETE FROM tracks WHERE file_path LIKE ?1 || '%'",
        [&folder_path],
    ).map_err(|e| e.to_string())?;

    let _ = conn.execute(
        "DELETE FROM library_paths WHERE path = ?1",
        [&folder_path],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
