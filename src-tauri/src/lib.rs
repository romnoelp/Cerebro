use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};

// TGC listens on localhost:13854; appKey must be exactly 40 hex chars.
const TGC_ADDR: &str = "127.0.0.1:13854";
const TGC_AUTH: &str =
    r#"{"appName":"Cerebro","appKey":"0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d"}"#;

// Mirrors the TGC `eegPower` JSON object.
// TGC names the 41–49.75 Hz band "highGamma"; remapped to `midGamma` on output.
#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RawEegPower {
    delta: u32,
    theta: u32,
    low_alpha: u32,
    high_alpha: u32,
    low_beta: u32,
    high_beta: u32,
    low_gamma: u32,
    high_gamma: u32,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RawESense {
    attention: Option<u8>,
    meditation: Option<u8>,
}

// TGC sends many packet types; all fields are optional.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TgcPacket {
    eeg_power: Option<RawEegPower>,
    e_sense: Option<RawESense>,
    poor_signal_level: Option<u8>,
}

// Emitted as the `tgc-data` event. Field names match BANDS keys in the chart.
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EegPayload {
    pub delta: u32,
    pub theta: u32,
    pub low_alpha: u32,
    pub high_alpha: u32,
    pub low_beta: u32,
    pub high_beta: u32,
    pub low_gamma: u32,
    pub mid_gamma: u32, // TGC's highGamma → midGamma
    pub attention: u8,
    pub meditation: u8,
    pub poor_signal_level: u8, // 0 = clean, 200 = no contact
}

struct TgcState {
    stop_flag: Arc<AtomicBool>,
    thread: Option<std::thread::JoinHandle<()>>,
}

impl Default for TgcState {
    fn default() -> Self {
        TgcState {
            stop_flag: Arc::new(AtomicBool::new(false)),
            thread: None,
        }
    }
}

type TgcStateGuard = Mutex<TgcState>;

fn run_tgc_reader(app: AppHandle, stop_flag: Arc<AtomicBool>) {
    // Retry connection every 2s until successful or stopped.
    let stream = loop {
        if stop_flag.load(Ordering::Relaxed) {
            return;
        }
        match TcpStream::connect(TGC_ADDR) {
            Ok(s) => break s,
            Err(_) => {
                let _ = app.emit("tgc-status", "disconnected");
                std::thread::sleep(Duration::from_secs(2));
            }
        }
    };

    // 500ms read timeout so the loop can check stop_flag while idle.
    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));

    {
        let mut writer = stream.try_clone().expect("clone stream for write");
        let _ = writeln!(writer, "{}", TGC_AUTH);
    }

    let _ = app.emit("tgc-status", "connected");

    let reader = BufReader::new(stream);

    for line in reader.lines() {
        if stop_flag.load(Ordering::Relaxed) {
            break;
        }

        let line = match line {
            Ok(l) => l,
            Err(e) => {
                use std::io::ErrorKind;
                // Timeouts are expected — re-check stop_flag and continue.
                if e.kind() == ErrorKind::WouldBlock || e.kind() == ErrorKind::TimedOut {
                    continue;
                }
                let _ = app.emit("tgc-status", "disconnected");
                break;
            }
        };

        if line.is_empty() {
            continue;
        }

        let packet: TgcPacket = match serde_json::from_str(&line) {
            Ok(p) => p,
            Err(_) => continue,
        };

        // Only emit on full eegPower packets; skip raw/blink/heartbeat types.
        if let Some(eeg) = packet.eeg_power {
            let sense = packet.e_sense.unwrap_or(RawESense {
                attention: None,
                meditation: None,
            });

            let payload = EegPayload {
                delta: eeg.delta,
                theta: eeg.theta,
                low_alpha: eeg.low_alpha,
                high_alpha: eeg.high_alpha,
                low_beta: eeg.low_beta,
                high_beta: eeg.high_beta,
                low_gamma: eeg.low_gamma,
                mid_gamma: eeg.high_gamma,
                attention: sense.attention.unwrap_or(0),
                meditation: sense.meditation.unwrap_or(0),
                poor_signal_level: packet.poor_signal_level.unwrap_or(200),
            };

            let _ = app.emit("tgc-data", payload);
        }
    }
}

/// Start the TGC reader thread. Idempotent — won't duplicate a running connection.
#[tauri::command]
fn start_tgc(app: AppHandle, state: State<TgcStateGuard>) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;

    if guard
        .thread
        .as_ref()
        .map(|t| !t.is_finished())
        .unwrap_or(false)
    {
        return Ok(());
    }

    guard.stop_flag = Arc::new(AtomicBool::new(false));
    let stop_flag = guard.stop_flag.clone();

    let handle = std::thread::spawn(move || {
        run_tgc_reader(app, stop_flag);
    });

    guard.thread = Some(handle);
    Ok(())
}

/// Signal the reader thread to stop. Thread exits within 500ms (read timeout).
#[tauri::command]
fn stop_tgc(state: State<TgcStateGuard>) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.stop_flag.store(true, Ordering::Relaxed);
    if let Some(thread) = guard.thread.take() {
        drop(thread);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(TgcStateGuard::default())
        .invoke_handler(tauri::generate_handler![start_tgc, stop_tgc])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
