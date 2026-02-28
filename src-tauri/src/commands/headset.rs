use std::sync::Arc;

use tauri::{AppHandle, State};

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
pub fn load_model_files(
    paths: ModelPaths,
    model: State<ModelManagerState>,
) -> Result<(), String> {
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
    model.lock().map_err(|e| e.to_string())?
        .as_mut()
        .ok_or(MODEL_NOT_LOADED)?
        .infer(&payload)
}

/// Runs a synthetic payload through the full pipeline so focus/unfocus code
/// paths can be exercised without a physical headset.
#[tauri::command]
pub fn get_mock_prediction(model: State<ModelManagerState>) -> Result<FocusPrediction, String> {
    let payload = mock_eeg_payload();
    model.lock().map_err(|e| e.to_string())?
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
