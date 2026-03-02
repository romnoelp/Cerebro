use std::io::{BufRead, BufReader};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::Duration;

use serde::Deserialize;
use tauri::{AppHandle, Emitter};

use crate::models::tgc_data::EegPayload;

/// Context passed into the reader thread — mirrors ReaderContext in tgc_reader.
pub struct Esp32ReaderCtx {
    pub app: AppHandle,
    pub stop_flag: Arc<AtomicBool>,
    pub port: String,
}

/// Flat JSON packet emitted by the ESP32 sketch.
/// All band-power fields are optional because the 512 Hz raw-only packets
/// omit them — `parse_packet` returns None for those so they are skipped.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Esp32Packet {
    poor_signal: Option<u8>,
    attention: Option<u8>,
    meditation: Option<u8>,
    delta: Option<u32>,
    theta: Option<u32>,
    low_alpha: Option<u32>,
    high_alpha: Option<u32>,
    low_beta: Option<u32>,
    high_beta: Option<u32>,
    low_gamma: Option<u32>,
    mid_gamma: Option<u32>,
}

/// Opens the COM port and streams parsed packets as `tgc-data` events so the
/// frontend hook (useTgcConnection) needs no changes.
pub fn run_esp32_reader(ctx: Esp32ReaderCtx) {
    if ctx.port.is_empty() {
        eprintln!("[esp32_reader] No port specified.");
        let _ = ctx.app.emit("tgc-status", "disconnected");
        return;
    }

    let port = match serialport::new(&ctx.port, 115_200)
        .timeout(Duration::from_millis(500))
        .open()
    {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[esp32_reader] Failed to open {}: {e}", ctx.port);
            let _ = ctx.app.emit("tgc-status", "disconnected");
            return;
        }
    };

    let _ = ctx.app.emit("tgc-status", "connected");

    // Use read_until instead of lines() to survive non-UTF-8 bytes that
    // commonly appear in the serial stream during ESP32 boot/reset.
    let mut reader = BufReader::new(port);
    let mut buf: Vec<u8> = Vec::with_capacity(256);

    loop {
        if ctx.stop_flag.load(Ordering::Relaxed) {
            break;
        }

        buf.clear();
        match reader.read_until(b'\n', &mut buf) {
            Ok(0) => {
                // EOF — port closed
                let _ = ctx.app.emit("tgc-status", "disconnected");
                break;
            }
            Ok(_) => {
                // Lossily decode — replaces any invalid bytes with • so we
                // never crash, and JSON parsing will simply return None.
                let line = String::from_utf8_lossy(&buf);
                let line = line.trim();
                if let Some(payload) = parse_packet(line) {
                    let _ = ctx.app.emit("tgc-data", payload);
                }
            }
            Err(e)
                if e.kind() == std::io::ErrorKind::TimedOut
                    || e.kind() == std::io::ErrorKind::WouldBlock =>
            {
                // 500 ms read timeout — normal between packets, keep looping.
                continue;
            }
            Err(e) => {
                eprintln!("[esp32_reader] Read error: {e}");
                let _ = ctx.app.emit("tgc-status", "disconnected");
                break;
            }
        }
    }
}

/// Returns Some only for full 1 Hz packets that contain all band-power values.
/// Raw-only packets ({"poorSignal":…,"raw":…}) return None and are skipped.
fn parse_packet(line: &str) -> Option<EegPayload> {
    if line.is_empty() {
        return None;
    }
    let pkt: Esp32Packet = serde_json::from_str(line).ok()?;

    Some(EegPayload {
        delta: pkt.delta?,
        theta: pkt.theta?,
        low_alpha: pkt.low_alpha?,
        high_alpha: pkt.high_alpha?,
        low_beta: pkt.low_beta?,
        high_beta: pkt.high_beta?,
        low_gamma: pkt.low_gamma?,
        mid_gamma: pkt.mid_gamma?,
        attention: pkt.attention.unwrap_or(0),
        meditation: pkt.meditation.unwrap_or(0),
        poor_signal_level: pkt.poor_signal.unwrap_or(200),
    })
}

/// Returns the names of all available serial ports on this machine.
pub fn available_ports() -> Vec<String> {
    serialport::available_ports()
        .unwrap_or_default()
        .into_iter()
        .map(|p| p.port_name)
        .collect()
}
