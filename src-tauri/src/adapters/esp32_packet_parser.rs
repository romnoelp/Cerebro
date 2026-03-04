use serde::Deserialize;

use crate::domain::eeg_packet::EegPacket;

// Flat JSON packet emitted by the ESP32 sketch (~1 Hz for band-power packets,
// 512 Hz for raw-only packets). Band-power fields are optional because raw
// packets omit them — parse_esp32_line returns None for those.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Esp32JsonPacket {
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

/// To deserialize a raw ESP32 JSON line into a complete EegPacket.
/// Returns None for 512 Hz raw-only packets that omit band-power fields.
pub fn parse_esp32_line(line: &str) -> Option<EegPacket> {
    if line.is_empty() {
        return None;
    }
    let packet: Esp32JsonPacket = serde_json::from_str(line).ok()?;

    Some(EegPacket {
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
