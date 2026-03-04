pub mod adapters;
pub mod domain;
pub mod infrastructure;
pub mod use_cases;

use std::sync::{Arc, Mutex};

use infrastructure::{
    app_state::{
        Esp32ConnectionState, HeadsetConnectionState, InferenceRunnerState, TgcConnectionState,
    },
    tauri_commands::{
        get_focus_prediction, get_mock_prediction, list_serial_ports, load_model_files,
        load_sessions, save_session, start_esp32, start_tgc, stop_esp32, stop_tgc,
    },
};
use tauri::Manager;

// ── Entry point ───────────────────────────────────────────────────────────────

/// To initialize all shared application state and register every Tauri
/// command before handing control to the event loop.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // The inference runner starts as None — the user loads files via
            // the Model Setup card, which calls load_model_files at runtime.
            app.manage(Arc::new(Mutex::new(None)) as InferenceRunnerState);
            app.manage(Mutex::new(HeadsetConnectionState::default()) as TgcConnectionState);
            app.manage(Mutex::new(HeadsetConnectionState::default()) as Esp32ConnectionState);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_model_files,
            start_tgc,
            stop_tgc,
            list_serial_ports,
            start_esp32,
            stop_esp32,
            get_focus_prediction,
            get_mock_prediction,
            save_session,
            load_sessions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
