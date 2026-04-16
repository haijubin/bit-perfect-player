use rusqlite::{Connection, Result};
use std::path::PathBuf;
// REMOVED: use std::fs; (Not used)

// Helper to get the path to the DB file
fn get_db_path() -> PathBuf {
    // REMOVED: mut (The path isn't being modified after creation)
    let path = PathBuf::from("library.db");
    path
}

pub fn init_db() -> Result<()> {
    let conn = get_db_connection()?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY,
            file_path TEXT UNIQUE,
            title TEXT,
            artist TEXT,
            album TEXT,
            year INTEGER,
            duration INTEGER,
            cover_url TEXT
        )",
        [],
    )?;

// 2. Create library_paths table 
    conn.execute(
        "CREATE TABLE IF NOT EXISTS library_paths (
            path TEXT PRIMARY KEY
        )",
        [],
    )?;

conn.execute(
    "CREATE TABLE IF NOT EXISTS replay_gain (
        track_id INTEGER PRIMARY KEY,
        track_gain REAL,   -- The dB value (e.g., -7.5)
        track_peak REAL,   -- The peak amplitude (useful for preventing clipping)
        FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
    )",
    [],
)?;

    Ok(())
}

pub fn get_db_connection() -> Result<Connection> {
    let path = get_db_path();
    Connection::open(path)
}
