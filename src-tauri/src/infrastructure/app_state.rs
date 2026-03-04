use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};

use crate::adapters::onnx_inference_runner::OnnxInferenceRunner;

/// Shared mutable state for one headset reader thread.
/// Both the TGC TCP reader and the ESP32 serial reader use this same structure.
pub struct HeadsetConnectionState {
    pub stop_flag: Arc<AtomicBool>,
    pub thread: Option<std::thread::JoinHandle<()>>,
}

impl HeadsetConnectionState {
    pub fn is_running(&self) -> bool {
        self.thread
            .as_ref()
            .map(|handle| !handle.is_finished())
            .unwrap_or(false)
    }

    /// To prepare the state for a new session by issuing a fresh stop flag.
    /// Must be called before spawning the reader thread so the old flag's
    /// residual true value cannot immediately halt the new thread.
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

impl Default for HeadsetConnectionState {
    fn default() -> Self {
        Self {
            stop_flag: Arc::new(AtomicBool::new(false)),
            thread: None,
        }
    }
}

pub type TgcConnectionState = Mutex<HeadsetConnectionState>;
/// Separate Tauri-managed state for the ESP32 serial reader.
pub type Esp32ConnectionState = Mutex<HeadsetConnectionState>;
/// Arc is required so load_model_files can replace the inner Option atomically
/// without cloning the state handle out of the Tauri manager.
pub type InferenceRunnerState = Arc<Mutex<Option<OnnxInferenceRunner>>>;
