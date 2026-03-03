use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

use crate::{
    models::{
        ml_data::{FocusPrediction, ModelManager, ModelPaths},
        tgc_data::EegPayload,
    },
    networking::{
        esp32_reader::{available_ports, run_esp32_reader, Esp32ReaderCtx},
        tgc_reader::{run_tgc_reader, ReaderContext},
    },
    Esp32StateGuard, HeadsetStateGuard, ModelManagerState,
};

const MODEL_NOT_LOADED: &str =
    "ML model not loaded — use the Model Setup card to load cerebro_unified.onnx and scaler_params.json";

/// To load the ONNX model and the StandardScaler parameters from
/// user-supplied file paths and make them available for inference.
/// Safe to call again to hot-swap a retrained model without restarting.
#[tauri::command]
pub fn load_model_files(paths: ModelPaths, model: State<ModelManagerState>) -> Result<(), String> {
    let manager = ModelManager::load(&paths)?;
    *model.lock().map_err(|error| error.to_string())? = Some(manager);
    Ok(())
}

/// To start streaming EEG data from the ThinkGear Connector TCP service.
/// Idempotent — a session already in progress is left unchanged.
#[tauri::command]
pub fn start_tgc(app: AppHandle, headset: State<HeadsetStateGuard>) -> Result<(), String> {
    let mut guard = headset.lock().map_err(|error| error.to_string())?;

    if guard.is_running() {
        return Ok(());
    }

    guard.reset();
    let ctx = ReaderContext {
        app,
        stop_flag: Arc::clone(&guard.stop_flag),
    };
    guard.thread = Some(std::thread::spawn(move || run_tgc_reader(ctx)));

    Ok(())
}

/// To signal the TGC reader thread to exit cleanly within one read-timeout
/// cycle (~500 ms).
#[tauri::command]
pub fn stop_tgc(headset: State<HeadsetStateGuard>) -> Result<(), String> {
    let mut guard = headset.lock().map_err(|error| error.to_string())?;
    guard.stop();
    Ok(())
}

// ── ESP32 USB serial source ──────────────────────────────────────────────────

/// To enumerate COM ports for the ESP32 source selector in the UI.
#[tauri::command]
pub fn list_serial_ports() -> Vec<String> {
    available_ports()
}

/// To start streaming EEG data from an ESP32 device connected over USB serial.
/// Idempotent — a running ESP32 session is left unchanged.
#[tauri::command]
pub fn start_esp32(
    port: String,
    app: AppHandle,
    esp32: State<Esp32StateGuard>,
) -> Result<(), String> {
    let mut guard = esp32.lock().map_err(|error| error.to_string())?;
    if guard.is_running() {
        return Ok(());
    }
    guard.reset();
    let ctx = Esp32ReaderCtx {
        app,
        stop_flag: Arc::clone(&guard.stop_flag),
        port,
    };
    guard.thread = Some(std::thread::spawn(move || run_esp32_reader(ctx)));
    Ok(())
}

/// To stop the ESP32 serial reader and release the COM port.
#[tauri::command]
pub fn stop_esp32(esp32: State<Esp32StateGuard>) -> Result<(), String> {
    let mut guard = esp32.lock().map_err(|error| error.to_string())?;
    guard.stop();
    Ok(())
}

#[tauri::command]
pub fn get_focus_prediction(
    payload: EegPayload,
    model: State<ModelManagerState>,
) -> Result<FocusPrediction, String> {
    model
        .lock()
        .map_err(|error| error.to_string())?
        .as_mut()
        .ok_or(MODEL_NOT_LOADED)?
        .infer(&payload)
}

/// To write a CSV byte sequence to a user-chosen path. Used by the frontend
/// once the save dialog resolves a destination so the file write stays within
/// the Rust permission boundary.
#[tauri::command]
pub fn write_csv(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|error| error.to_string())
}

/// Compact summary of one recorded session. Mirrors SessionSummary in eeg.ts.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
    pub id: String,
    pub subject_name: String,
    pub exported_at: String,
    pub csv_path: String,
    pub sample_count: u32,
    pub duration_secs: f64,
    pub focused_count: u32,
    pub unfocused_count: u32,
    pub mean_alpha: f64,
    pub mean_theta: f64,
    pub mean_attention: f64,
    pub mean_meditation: f64,
    pub signal_quality_pct: f64,
}

/// Bundles the three frontend-supplied fields for a session save operation.
/// Required by the Rule of Three: no command may accept more than two
/// positional payload arguments from the frontend JSON payload.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSessionRequest {
    pub csv_path: String,
    pub csv_content: String,
    pub summary: SessionSummary,
}

fn sessions_index_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("sessions.json"))
}

fn read_session_registry(index_path: &std::path::PathBuf) -> Result<Vec<SessionSummary>, String> {
    if !index_path.exists() {
        return Ok(vec![]);
    }
    let raw = std::fs::read_to_string(index_path).map_err(|error| error.to_string())?;
    Ok(serde_json::from_str(&raw).unwrap_or_default())
}

fn append_to_session_registry(
    index_path: &std::path::PathBuf,
    summary: SessionSummary,
) -> Result<(), String> {
    let mut registry = read_session_registry(index_path)?;
    registry.push(summary);
    let serialized = serde_json::to_string_pretty(&registry).map_err(|error| error.to_string())?;
    std::fs::write(index_path, serialized).map_err(|error| error.to_string())
}

/// To persist a completed session: writes the CSV to disk first, then appends
/// a summary entry to sessions.json. The index is only updated after the CSV
/// write succeeds, keeping the two stores consistent under failure.
#[tauri::command]
pub fn save_session(app: AppHandle, request: SaveSessionRequest) -> Result<(), String> {
    std::fs::write(&request.csv_path, request.csv_content).map_err(|error| error.to_string())?;
    let index = sessions_index_path(&app)?;
    append_to_session_registry(&index, request.summary)
}

/// To return all saved session summaries from the local index, or an empty
/// collection on first launch when no sessions have been recorded yet.
#[tauri::command]
pub fn load_sessions(app: AppHandle) -> Result<Vec<SessionSummary>, String> {
    let index = sessions_index_path(&app)?;
    read_session_registry(&index)
}

/// Runs a synthetic payload through the full pipeline so focus/unfocus code
/// paths can be exercised without a physical headset.
/// To exercise the full inference pipeline without a physical headset.
/// Alternates between a focused and unfocused synthetic profile every 5 s
/// so both prediction paths are reachable from the development UI.
#[tauri::command]
pub fn get_mock_prediction(model: State<ModelManagerState>) -> Result<FocusPrediction, String> {
    let eeg_payload = mock_eeg_payload();
    model
        .lock()
        .map_err(|error| error.to_string())?
        .as_mut()
        .ok_or(MODEL_NOT_LOADED)?
        .infer(&eeg_payload)
}

// Alternates between a beta-dominant (focused) and alpha-dominant (unfocused)
// profile every 5 s using wall-clock time, so both prediction labels are
// reachable without a physical headset or an external rand dependency.
fn mock_eeg_payload() -> EegPayload {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    if (secs / 5) % 2 == 0 {
        // Focused: beta dominates
        EegPayload {
            delta: 150_000,
            theta: 80_000,
            low_alpha: 60_000,
            high_alpha: 50_000,
            low_beta: 300_000,
            high_beta: 250_000,
            low_gamma: 40_000,
            mid_gamma: 30_000,
            attention: 75,
            meditation: 40,
            poor_signal_level: 0,
        }
    } else {
        // Unfocused: low-alpha dominates
        EegPayload {
            delta: 200_000,
            theta: 90_000,
            low_alpha: 350_000,
            high_alpha: 300_000,
            low_beta: 80_000,
            high_beta: 70_000,
            low_gamma: 30_000,
            mid_gamma: 20_000,
            attention: 35,
            meditation: 65,
            poor_signal_level: 0,
        }
    }
}
