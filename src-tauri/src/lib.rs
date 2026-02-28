mod commands;
mod models;
mod networking;

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};

use commands::headset::{
    get_focus_prediction, get_mock_prediction, load_model_files, start_tgc, stop_tgc, write_csv,
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
            .map(|t| !t.is_finished())
            .unwrap_or(false)
    }

    // Clears the stop flag so the next session starts with a fresh signal.
    pub fn reset(&mut self) {
        self.stop_flag = Arc::new(AtomicBool::new(false));
        self.thread = None;
    }

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

// Arc so load_model_files can replace the inner Option without cloning state
// out of the Tauri manager.
pub type ModelManagerState = Arc<Mutex<Option<ModelManager>>>;

// ── Entry point ──────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // ModelManager starts as None — the user loads the files via the
            // Model Setup card in the Session screen, which calls load_model_files.
            app.manage(Arc::new(Mutex::new(None::<ModelManager>)) as ModelManagerState);
            app.manage(Mutex::new(HeadsetState::default()) as HeadsetStateGuard);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_model_files,
            start_tgc,
            stop_tgc,
            get_focus_prediction,
            get_mock_prediction,
            write_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
