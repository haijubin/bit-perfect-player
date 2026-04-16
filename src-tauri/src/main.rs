// Prevents additional console window on Windows in release, do not remove!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod modules;

// Add this import at the top of main.rs
use crate::modules::player::PlayerState;

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
            crate::modules::player::start_bit_perfect_stream,
            crate::modules::player::toggle_playback
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
