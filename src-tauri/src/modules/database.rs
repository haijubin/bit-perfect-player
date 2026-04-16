use rusqlite::Connection;

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
            file_path TEXT UNIQUE,  -- Make sure this is 'file_path'
            cover_url TEXT
        )",
        [],
    ).expect("Failed to create table");
    conn
}
