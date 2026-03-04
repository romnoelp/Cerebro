use std::sync::Arc;

use tauri::{AppHandle, Manager, State};

use crate::{
    adapters::{
        file_session_repository::FileSessionRepository,
        onnx_inference_runner::{ModelFilePaths, OnnxInferenceRunner},
    },
    domain::{
        eeg_packet::EegPacket,
        focus_reading::FocusReading,
        session_summary::SessionSummary,
    },
    infrastructure::{
        app_state::{Esp32ConnectionState, InferenceRunnerState, TgcConnectionState},
        esp32_reader::{list_available_serial_ports, run_esp32_reader, Esp32ReaderContext},
        tgc_reader::{run_tgc_reader, TgcReaderContext},
    },
    use_cases::{
        classify_eeg_packet::classify_eeg_packet,
        manage_session_records::{load_session_summaries, persist_session_summary},
    },
};

const MODEL_NOT_LOADED_MESSAGE: &str =
    "ML model not loaded — use the Model Setup card to load cerebro_unified.onnx and scaler_params.json";

/// To load the ONNX model and the StandardScaler parameters from user-supplied
/// file paths and make them available for inference.
/// Safe to call again to hot-swap a retrained model without restarting.
#[tauri::command]
pub fn load_model_files(
    paths: ModelFilePaths,
    runner_state: State<InferenceRunnerState>,
) -> Result<(), String> {
    let runner = OnnxInferenceRunner::load(&paths)?;
    *runner_state.lock().map_err(|error| error.to_string())? = Some(runner);
    Ok(())
}

/// To start streaming EEG data from the ThinkGear Connector TCP service.
/// Idempotent — a session already in progress is left unchanged.
#[tauri::command]
pub fn start_tgc(
    app: AppHandle,
    tgc_state: State<TgcConnectionState>,
) -> Result<(), String> {
    let mut guard = tgc_state.lock().map_err(|error| error.to_string())?;
    if guard.is_running() {
        return Ok(());
    }
    guard.reset();
    let ctx = TgcReaderContext {
        app,
        stop_flag: Arc::clone(&guard.stop_flag),
    };
    guard.thread = Some(std::thread::spawn(move || run_tgc_reader(ctx)));
    Ok(())
}

/// To signal the TGC reader thread to exit cleanly within one read-timeout
/// cycle (~500 ms).
#[tauri::command]
pub fn stop_tgc(tgc_state: State<TgcConnectionState>) -> Result<(), String> {
    let mut guard = tgc_state.lock().map_err(|error| error.to_string())?;
    guard.stop();
    Ok(())
}

/// To enumerate COM ports visible to the OS for the ESP32 source selector.
#[tauri::command]
pub fn list_serial_ports() -> Vec<String> {
    list_available_serial_ports()
}

/// To start streaming EEG data from an ESP32 device connected over USB serial.
/// Idempotent — a running ESP32 session is left unchanged.
#[tauri::command]
pub fn start_esp32(
    port: String,
    app: AppHandle,
    esp32_state: State<Esp32ConnectionState>,
) -> Result<(), String> {
    let mut guard = esp32_state.lock().map_err(|error| error.to_string())?;
    if guard.is_running() {
        return Ok(());
    }
    guard.reset();
    let ctx = Esp32ReaderContext {
        app,
        stop_flag: Arc::clone(&guard.stop_flag),
        port_name: port,
    };
    guard.thread = Some(std::thread::spawn(move || run_esp32_reader(ctx)));
    Ok(())
}

/// To stop the ESP32 serial reader and release the COM port.
#[tauri::command]
pub fn stop_esp32(esp32_state: State<Esp32ConnectionState>) -> Result<(), String> {
    let mut guard = esp32_state.lock().map_err(|error| error.to_string())?;
    guard.stop();
    Ok(())
}

/// To run one EEG packet through the loaded inference model and return a focus label.
#[tauri::command]
pub fn get_focus_prediction(
    payload: EegPacket,
    runner_state: State<InferenceRunnerState>,
) -> Result<FocusReading, String> {
    let mut guard = runner_state.lock().map_err(|error| error.to_string())?;
    let runner = guard.as_mut().ok_or(MODEL_NOT_LOADED_MESSAGE)?;
    classify_eeg_packet(&payload, runner).map_err(|error| error.to_string())
}

/// To exercise the full inference pipeline without a physical headset.
/// Alternates between a beta-dominant (focused) and alpha-dominant (unfocused)
/// synthetic profile every 5 s so both prediction paths are reachable.
#[tauri::command]
pub fn get_mock_prediction(
    runner_state: State<InferenceRunnerState>,
) -> Result<FocusReading, String> {
    let mock_packet = build_mock_eeg_packet();
    let mut guard = runner_state.lock().map_err(|error| error.to_string())?;
    let runner = guard.as_mut().ok_or(MODEL_NOT_LOADED_MESSAGE)?;
    classify_eeg_packet(&mock_packet, runner).map_err(|error| error.to_string())
}

// Alternates between beta-dominant (focused) and alpha-dominant (unfocused)
// every 5 s using wall-clock time so both labels are reachable without a
// physical headset or an external rand dependency.
fn build_mock_eeg_packet() -> EegPacket {
    let elapsed_seconds = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    if (elapsed_seconds / 5) % 2 == 0 {
        EegPacket {
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
        EegPacket {
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

/// Bundles the three frontend-supplied fields for a session save operation.
/// Wrapping them in a struct satisfies the rule against 3+ bare positional arguments.
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSessionRequest {
    pub csv_path: String,
    pub csv_content: String,
    pub summary: SessionSummary,
}

fn resolve_sessions_index_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("sessions.json"))
}

/// To persist a completed session: writes the CSV to disk first, then appends
/// a summary entry to sessions.json. The index is only updated after the CSV
/// write succeeds, keeping the two stores consistent under failure.
#[tauri::command]
pub fn save_session(app: AppHandle, request: SaveSessionRequest) -> Result<(), String> {
    std::fs::write(&request.csv_path, request.csv_content)
        .map_err(|error| error.to_string())?;
    let index_path = resolve_sessions_index_path(&app)?;
    let mut repository = FileSessionRepository::new(index_path);
    persist_session_summary(request.summary, &mut repository).map_err(|error| error.to_string())
}

/// To return all saved session summaries from the local index, or an empty
/// collection on first launch when no sessions have been recorded yet.
#[tauri::command]
pub fn load_sessions(app: AppHandle) -> Result<Vec<SessionSummary>, String> {
    let index_path = resolve_sessions_index_path(&app)?;
    let repository = FileSessionRepository::new(index_path);
    load_session_summaries(&repository).map_err(|error| error.to_string())
}
