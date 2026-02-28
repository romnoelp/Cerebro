use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

use crate::{
    models::{
        ml_data::{FocusPrediction, ModelManager, ModelPaths},
        tgc_data::EegPayload,
    },
    networking::tgc_reader::{run_tgc_reader, ReaderContext},
    HeadsetStateGuard, ModelManagerState,
};

const MODEL_NOT_LOADED: &str =
    "ML model not loaded — use the Model Setup card to load cerebro_unified.onnx and scaler_params.json";

/// Loads the ONNX model and scaler from user-supplied paths.
/// Replaces any previously loaded instance — safe to call again to hot-swap a
/// retrained model without restarting the app.
#[tauri::command]
pub fn load_model_files(paths: ModelPaths, model: State<ModelManagerState>) -> Result<(), String> {
    let manager = ModelManager::load(&paths)?;
    *model.lock().map_err(|e| e.to_string())? = Some(manager);
    Ok(())
}

/// Idempotent — a running session is left unchanged.
#[tauri::command]
pub fn start_tgc(app: AppHandle, headset: State<HeadsetStateGuard>) -> Result<(), String> {
    let mut guard = headset.lock().map_err(|e| e.to_string())?;

    // Prevents spawning a second thread when the frontend hot-reloads.
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

/// Signal the reader thread to exit within one read-timeout cycle (~500 ms).
#[tauri::command]
pub fn stop_tgc(headset: State<HeadsetStateGuard>) -> Result<(), String> {
    let mut guard = headset.lock().map_err(|e| e.to_string())?;
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
        .map_err(|e| e.to_string())?
        .as_mut()
        .ok_or(MODEL_NOT_LOADED)?
        .infer(&payload)
}

/// Writes `content` to `path` on disk, creating or overwriting the file.
/// Used by the frontend to persist a session's CSV after the save dialog
/// resolves a destination path.
#[tauri::command]
pub fn write_csv(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
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

fn sessions_index_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("sessions.json"))
}

/// Writes the CSV then appends a summary entry to sessions.json.
/// Atomic — the index is only updated after the CSV write succeeds.
#[tauri::command]
pub fn save_session(
    app: AppHandle,
    csv_path: String,
    csv_content: String,
    summary: SessionSummary,
) -> Result<(), String> {
    std::fs::write(&csv_path, csv_content).map_err(|e| e.to_string())?;

    let index = sessions_index_path(&app)?;
    let mut sessions: Vec<SessionSummary> = if index.exists() {
        let raw = std::fs::read_to_string(&index).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).unwrap_or_default()
    } else {
        vec![]
    };

    sessions.push(summary);
    let serialized = serde_json::to_string_pretty(&sessions).map_err(|e| e.to_string())?;
    std::fs::write(&index, serialized).map_err(|e| e.to_string())
}

/// Returns all saved session summaries, or an empty list on first launch.
#[tauri::command]
pub fn load_sessions(app: AppHandle) -> Result<Vec<SessionSummary>, String> {
    let index = sessions_index_path(&app)?;
    if !index.exists() {
        return Ok(vec![]);
    }
    let raw = std::fs::read_to_string(&index).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

/// Runs a synthetic payload through the full pipeline so focus/unfocus code
/// paths can be exercised without a physical headset.
#[tauri::command]
pub fn get_mock_prediction(model: State<ModelManagerState>) -> Result<FocusPrediction, String> {
    let payload = mock_eeg_payload();
    model
        .lock()
        .map_err(|e| e.to_string())?
        .as_mut()
        .ok_or(MODEL_NOT_LOADED)?
        .infer(&payload)
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
