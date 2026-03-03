use std::io::{BufRead, BufReader, ErrorKind, Write};
use std::net::TcpStream;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::Duration;

use tauri::{AppHandle, Emitter};

use crate::models::tgc_data::{EegPayload, TgcPacket};

pub const TGC_ADDR: &str = "127.0.0.1:13854";

// appKey must be exactly 40 hex characters; TGC rejects the connection otherwise.
const TGC_AUTH: &str =
    r#"{"appName":"Cerebro","appKey":"0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d"}"#;

/// App handle and stop flag travel together through every layer of the reader.
pub struct ReaderContext {
    pub app: AppHandle,
    pub stop_flag: Arc<AtomicBool>,
}

/// To maintain a persistent TCP connection to a running ThinkGear Connector
/// process and forward each complete EEG packet as a `tgc-data` event.
/// Retries automatically on disconnection so the app recovers when TGC is
/// restarted without requiring user intervention.
pub fn run_tgc_reader(ctx: ReaderContext) {
    let Some(stream) = try_connect(&ctx) else {
        return;
    };

    handshake(&stream, &ctx);

    for result in BufReader::new(stream).lines() {
        if ctx.stop_flag.load(Ordering::Relaxed) {
            break;
        }
        let line = match result {
            Ok(line) => line,
            Err(error) if matches!(error.kind(), ErrorKind::WouldBlock | ErrorKind::TimedOut) => {
                continue
            }
            Err(_) => {
                let _ = ctx.app.emit("tgc-status", "disconnected");
                break;
            }
        };
        let Some(eeg_payload) = parse_packet(&line) else {
            continue;
        };
        let _ = ctx.app.emit("tgc-data", eeg_payload);
    }
}

// To keep retrying the TCP connection until one succeeds or the stop flag is
// raised. A 2 s sleep between attempts avoids busy-looping while TGC is
// starting, and a disconnected event on each failure lets the UI stay current.
fn try_connect(ctx: &ReaderContext) -> Option<TcpStream> {
    loop {
        if ctx.stop_flag.load(Ordering::Relaxed) {
            return None;
        }
        match TcpStream::connect(TGC_ADDR) {
            Ok(stream) => return Some(stream),
            Err(_) => {
                let _ = ctx.app.emit("tgc-status", "disconnected");
                std::thread::sleep(Duration::from_secs(2));
            }
        }
    }
}

fn handshake(stream: &TcpStream, ctx: &ReaderContext) {
    // 500 ms read timeout lets the loop check stop_flag between 1 Hz packets.
    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
    let mut writer = stream
        .try_clone()
        .expect("TcpStream::try_clone for auth write");
    let _ = writeln!(writer, "{}", TGC_AUTH);
    let _ = ctx.app.emit("tgc-status", "connected");
}

// To deserialize one line of TGC JSON and extract only packets that carry a
// complete `eegPower` block. Heartbeat and status-only packets return None
// and are silently skipped, which is the expected protocol behavior.
pub fn parse_packet(line: &str) -> Option<EegPayload> {
    if line.is_empty() {
        return None;
    }
    let packet: TgcPacket = serde_json::from_str(line).ok()?;
    let poor_signal_level = packet.poor_signal_level.unwrap_or(200);
    let esense = packet.e_sense.unwrap_or_default();
    let eeg_power = packet.eeg_power?;

    Some(EegPayload {
        delta: eeg_power.delta,
        theta: eeg_power.theta,
        low_alpha: eeg_power.low_alpha,
        high_alpha: eeg_power.high_alpha,
        low_beta: eeg_power.low_beta,
        high_beta: eeg_power.high_beta,
        low_gamma: eeg_power.low_gamma,
        mid_gamma: eeg_power.high_gamma,
        attention: esense.attention.unwrap_or(0),
        meditation: esense.meditation.unwrap_or(0),
        poor_signal_level,
    })
}
