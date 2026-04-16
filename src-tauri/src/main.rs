// Prevents additional console window on Windows in release, do not remove!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod modules;

// Add this import at the top of main.rs
use crate::modules::player::PlayerState;

#[tauri::command]
fn get_library_paths() -> Vec<String> {
    // 1. Get connection (return empty list if DB fails)
    let conn = match crate::modules::database::get_db_connection() {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    
    // 2. Prepare statement (return empty list if table doesn't exist yet)
    let mut stmt = match conn.prepare("SELECT path FROM library_paths") {
        Ok(s) => s,
        Err(_) => return Vec::new(), 
    };

    // 3. Map rows to Strings
    let path_results = stmt.query_map([], |row| {
        row.get::<_, String>(0) // Tell Rust explicitly to treat column 0 as a String
    });

    match path_results {
        Ok(rows) => rows.filter_map(|p| p.ok()).collect(),
        Err(_) => Vec::new(),
    }
}

fn main() {
    // Initialize the database and ensure the tracks table exists
    let _ = crate::modules::database::init_db();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(PlayerState::default())
        .invoke_handler(tauri::generate_handler![
            crate::modules::scanner::scan_music_folder,
            crate::modules::scanner::get_library,
            crate::modules::scanner::remove_music_path, // New command registered here
            get_library_paths,
            crate::modules::player::start_bit_perfect_stream,
            crate::modules::player::toggle_playback
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
