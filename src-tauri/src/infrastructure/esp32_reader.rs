use std::io::{BufRead, BufReader};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::Duration;

use tauri::{AppHandle, Emitter};

use crate::adapters::esp32_packet_parser::parse_esp32_line;

/// Context passed into the ESP32 reader thread — mirrors TgcReaderContext.
pub struct Esp32ReaderContext {
    pub app: AppHandle,
    pub stop_flag: Arc<AtomicBool>,
    pub port_name: String,
}

/// To open the configured COM port and stream parsed EEG packets as `tgc-data`
/// events. Uses the same event names as the TGC reader so the frontend hook
/// is source-agnostic beyond the start/stop commands.
pub fn run_esp32_reader(ctx: Esp32ReaderContext) {
    let Some(serial_port) = open_serial_port(&ctx) else {
        return;
    };
    let _ = ctx.app.emit("tgc-status", "connected");
    stream_serial_packets(serial_port, &ctx);
}

// To acquire an exclusive handle to the named COM port before streaming
// begins. Emits a disconnected status event on any failure so the UI
// reflects the error without requiring the caller to inspect the return value.
fn open_serial_port(ctx: &Esp32ReaderContext) -> Option<Box<dyn serialport::SerialPort>> {
    if ctx.port_name.is_empty() {
        eprintln!("[IO] ESP32 reader aborted — no serial port was specified");
        let _ = ctx.app.emit("tgc-status", "disconnected");
        return None;
    }
    match serialport::new(&ctx.port_name, 115_200)
        .timeout(Duration::from_millis(500))
        .open()
    {
        Ok(serial_port) => Some(serial_port),
        Err(error) => {
            eprintln!("[IO] Failed to open {}: {error}", ctx.port_name);
            let _ = ctx.app.emit("tgc-status", "disconnected");
            None
        }
    }
}

// To consume the serial byte stream line-by-line and forward every complete
// EEG packet to the frontend. Uses read_until rather than lines() because
// ESP32 boot sequences can emit non-UTF-8 bytes that would terminate a
// lines() iterator prematurely.
fn stream_serial_packets(serial_port: Box<dyn serialport::SerialPort>, ctx: &Esp32ReaderContext) {
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
            Ok(_) => emit_if_complete_eeg_packet(&line_buffer, ctx),
            Err(error)
                if error.kind() == std::io::ErrorKind::TimedOut
                    || error.kind() == std::io::ErrorKind::WouldBlock =>
            {
                continue;
            }
            Err(error) => {
                eprintln!("[IO] Serial read error on {}: {error}", ctx.port_name);
                let _ = ctx.app.emit("tgc-status", "disconnected");
                break;
            }
        }
    }
}

// To decode one raw byte line and forward it only when it carries a complete
// 1 Hz EEG packet. Lossily decodes bytes so non-UTF-8 boot noise becomes
// harmless placeholder characters that JSON parsing discards.
fn emit_if_complete_eeg_packet(line_buffer: &[u8], ctx: &Esp32ReaderContext) {
    let raw_line = String::from_utf8_lossy(line_buffer);
    if let Some(eeg_packet) = parse_esp32_line(raw_line.trim()) {
        let _ = ctx.app.emit("tgc-data", eeg_packet);
    }
}

/// To enumerate all serial ports currently visible to the OS and return
/// their names so the UI can populate a port-selection dropdown.
pub fn list_available_serial_ports() -> Vec<String> {
    serialport::available_ports()
        .unwrap_or_default()
        .into_iter()
        .map(|port_info| port_info.port_name)
        .collect()
}
