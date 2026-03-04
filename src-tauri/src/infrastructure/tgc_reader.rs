use std::io::{BufRead, BufReader, ErrorKind, Write};
use std::net::TcpStream;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::Duration;

use tauri::{AppHandle, Emitter};

use crate::adapters::tgc_packet_parser::parse_tgc_line;

pub const TGC_HOST_ADDRESS: &str = "127.0.0.1:13854";

// appKey must be exactly 40 hex characters; TGC rejects shorter or longer values.
const TGC_AUTH_PAYLOAD: &str =
    r#"{"appName":"Cerebro","appKey":"0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d"}"#;

/// Context that travels through every stage of the TGC reader lifecycle.
pub struct TgcReaderContext {
    pub app: AppHandle,
    pub stop_flag: Arc<AtomicBool>,
}

/// To maintain a persistent TCP connection to a running ThinkGear Connector
/// process and forward each complete EEG packet as a `tgc-data` event.
/// Retries automatically on disconnection so the app recovers when TGC is
/// restarted without requiring user intervention.
pub fn run_tgc_reader(ctx: TgcReaderContext) {
    let Some(stream) = connect_with_retry(&ctx) else {
        return;
    };
    configure_and_authenticate(&stream, &ctx);
    forward_eeg_packets(stream, &ctx);
}

// To keep retrying the TCP connection until one succeeds or the stop flag is
// raised. A 2 s sleep between attempts avoids busy-looping while TGC starts,
// and a disconnected status event on each failure lets the UI stay current.
fn connect_with_retry(ctx: &TgcReaderContext) -> Option<TcpStream> {
    loop {
        if ctx.stop_flag.load(Ordering::Relaxed) {
            return None;
        }
        match TcpStream::connect(TGC_HOST_ADDRESS) {
            Ok(stream) => return Some(stream),
            Err(_) => {
                let _ = ctx.app.emit("tgc-status", "disconnected");
                std::thread::sleep(Duration::from_secs(2));
            }
        }
    }
}

fn configure_and_authenticate(stream: &TcpStream, ctx: &TgcReaderContext) {
    // 500 ms read timeout lets the forward loop check stop_flag between 1 Hz packets.
    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
    let mut writer = stream
        .try_clone()
        .expect("TcpStream::try_clone for auth write");
    let _ = writeln!(writer, "{}", TGC_AUTH_PAYLOAD);
    let _ = ctx.app.emit("tgc-status", "connected");
}

fn forward_eeg_packets(stream: TcpStream, ctx: &TgcReaderContext) {
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
        if let Some(eeg_packet) = parse_tgc_line(&line) {
            let _ = ctx.app.emit("tgc-data", eeg_packet);
        }
    }
}
