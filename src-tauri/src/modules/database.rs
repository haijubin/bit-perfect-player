use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::fs;

// In Tauri v2, we usually resolve paths relative to the executable 
// or use a dedicated path plugin. For simplicity and reliability:
fn get_db_path() -> PathBuf {
    // This places the DB in the same folder as the app data or current dir
    let mut path = PathBuf::from("library.db");
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
    Ok(())
}

// The core connection helper
pub fn get_db_connection() -> Result<Connection> {
    let path = get_db_path();
    Connection::open(path)
}
