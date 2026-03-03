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

/// To open the configured COM port and start streaming parsed EEG packets
/// as `tgc-data` events. Emits `tgc-status` on connect and disconnect so
/// the frontend hook requires no source-specific branching.
pub fn run_esp32_reader(ctx: Esp32ReaderCtx) {
    let Some(serial_port) = open_serial_port(&ctx) else {
        return;
    };
    let _ = ctx.app.emit("tgc-status", "connected");
    stream_serial_packets(serial_port, &ctx);
}

// To acquire an exclusive handle to the named COM port before streaming
// begins. Emits a disconnected status event on any failure so the UI
// reflects the error without requiring the caller to inspect the return value.
fn open_serial_port(ctx: &Esp32ReaderCtx) -> Option<Box<dyn serialport::SerialPort>> {
    if ctx.port.is_empty() {
        eprintln!("[IO] ESP32 reader aborted — no serial port was specified");
        let _ = ctx.app.emit("tgc-status", "disconnected");
        return None;
    }
    match serialport::new(&ctx.port, 115_200)
        .timeout(Duration::from_millis(500))
        .open()
    {
        Ok(serial_port) => Some(serial_port),
        Err(error) => {
            eprintln!("[IO] Failed to open serial port {}: {error}", ctx.port);
            let _ = ctx.app.emit("tgc-status", "disconnected");
            None
        }
    }
}

// To consume the serial byte stream line-by-line and forward every complete
// EEG packet to the frontend. Uses read_until rather than lines() because
// ESP32 boot sequences can emit non-UTF-8 bytes that would terminate a
// lines() iterator prematurely.
fn stream_serial_packets(serial_port: Box<dyn serialport::SerialPort>, ctx: &Esp32ReaderCtx) {
    let mut reader = BufReader::new(serial_port);
    let mut line_buffer: Vec<u8> = Vec::with_capacity(256);

    loop {
        if ctx.stop_flag.load(Ordering::Relaxed) {
            break;
        }
        line_buffer.clear();
        match reader.read_until(b'\n', &mut line_buffer) {
            Ok(0) => {
                let _ = ctx.app.emit("tgc-status", "disconnected");
                break;
            }
            Ok(_) => emit_if_complete_packet(&line_buffer, ctx),
            Err(error)
                if error.kind() == std::io::ErrorKind::TimedOut
                    || error.kind() == std::io::ErrorKind::WouldBlock =>
            {
                continue;
            }
            Err(error) => {
                eprintln!("[IO] Serial read error on {}: {error}", ctx.port);
                let _ = ctx.app.emit("tgc-status", "disconnected");
                break;
            }
        }
    }
}

// To decode one raw byte line and forward it only when it carries a complete
// 1 Hz EEG packet. Lossily decodes bytes so non-UTF-8 boot noise becomes
// harmless placeholder characters that JSON parsing discards.
fn emit_if_complete_packet(line_buffer: &[u8], ctx: &Esp32ReaderCtx) {
    let raw_line = String::from_utf8_lossy(line_buffer);
    let trimmed_line = raw_line.trim();
    if let Some(eeg_payload) = parse_packet(trimmed_line) {
        let _ = ctx.app.emit("tgc-data", eeg_payload);
    }
}

// To deserialize a raw JSON line into a typed EEG payload. Returns None for
// heartbeat packets (raw-only) that omit band-power fields — those are normal
// at 512 Hz and must be silently discarded without breaking the stream.
fn parse_packet(line: &str) -> Option<EegPayload> {
    if line.is_empty() {
        return None;
    }
    let packet: Esp32Packet = serde_json::from_str(line).ok()?;

    Some(EegPayload {
        delta: packet.delta?,
        theta: packet.theta?,
        low_alpha: packet.low_alpha?,
        high_alpha: packet.high_alpha?,
        low_beta: packet.low_beta?,
        high_beta: packet.high_beta?,
        low_gamma: packet.low_gamma?,
        mid_gamma: packet.mid_gamma?,
        attention: packet.attention.unwrap_or(0),
        meditation: packet.meditation.unwrap_or(0),
        poor_signal_level: packet.poor_signal.unwrap_or(200),
    })
}

/// To enumerate all serial ports currently visible to the OS and return
/// their names so the UI can populate a port-selection dropdown.
pub fn available_ports() -> Vec<String> {
    serialport::available_ports()
        .unwrap_or_default()
        .into_iter()
        .map(|port_info| port_info.port_name)
        .collect()
}
