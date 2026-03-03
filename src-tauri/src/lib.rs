mod commands;
mod models;
mod networking;

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};

use commands::headset::{
    get_focus_prediction, get_mock_prediction, list_serial_ports, load_model_files, load_sessions,
    save_session, start_esp32, start_tgc, stop_esp32, stop_tgc, write_csv,
};
use models::ml_data::ModelManager;
use tauri::Manager;

// ── State types ──────────────────────────────────────────────────────────────

pub struct HeadsetState {
    pub stop_flag: Arc<AtomicBool>,
    pub thread: Option<std::thread::JoinHandle<()>>,
}

impl HeadsetState {
    pub fn is_running(&self) -> bool {
        self.thread
            .as_ref()
            .map(|thread_handle| !thread_handle.is_finished())
            .unwrap_or(false)
    }

    /// To prepare the state for a new session by issuing a fresh stop flag.
    /// Must be called before spawning the reader thread so the old flag's
    /// residual `true` value cannot immediately halt the new thread.
    pub fn reset(&mut self) {
        self.stop_flag = Arc::new(AtomicBool::new(false));
        self.thread = None;
    }

    /// To request a graceful shutdown of the active reader thread.
    pub fn stop(&mut self) {
        self.stop_flag.store(true, Ordering::Relaxed);
        // Dropping the handle without joining lets the thread finish its current
        // read-timeout cycle (~500 ms) rather than blocking the UI thread.
        self.thread.take();
    }
}

impl Default for HeadsetState {
    fn default() -> Self {
        Self {
            stop_flag: Arc::new(AtomicBool::new(false)),
            thread: None,
        }
    }
}

pub type HeadsetStateGuard = Mutex<HeadsetState>;
/// Separate state for the ESP32 serial reader — same structure, different Tauri key.
pub type Esp32StateGuard = Mutex<HeadsetState>;

// Arc is required so load_model_files can replace the inner Option atomically
// without cloning the state handle out of the Tauri manager.
pub type ModelManagerState = Arc<Mutex<Option<ModelManager>>>;

// ── Entry point ───────────────────────────────────────────────────────────────────────────

/// To initialize all shared application state and register every Tauri
/// command before handing control to the event loop.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // ModelManager starts as None — the user loads files via the Model
            // Setup card, which calls load_model_files to populate it at runtime.
            app.manage(Arc::new(Mutex::new(None::<ModelManager>)) as ModelManagerState);
            app.manage(Mutex::new(HeadsetState::default()) as HeadsetStateGuard);
            app.manage(Mutex::new(HeadsetState::default()) as Esp32StateGuard);
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
            write_csv,
            save_session,
            load_sessions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
