use crate::domain::eeg_packet::{EegPacket, RawTgcPacket};

/// To deserialize one TGC JSON line and extract a complete EegPacket.
/// Returns None for heartbeat and status-only packets that omit eegPower —
/// those are normal protocol behavior and must be silently discarded.
pub fn parse_tgc_line(line: &str) -> Option<EegPacket> {
    if line.is_empty() {
        return None;
    }
    let packet: RawTgcPacket = serde_json::from_str(line).ok()?;
    let poor_signal_level = packet.poor_signal_level.unwrap_or(200);
    let esense = packet.e_sense.unwrap_or_default();
    let eeg_power = packet.eeg_power?;

    Some(EegPacket {
        delta: eeg_power.delta,
        theta: eeg_power.theta,
        low_alpha: eeg_power.low_alpha,
        high_alpha: eeg_power.high_alpha,
        low_beta: eeg_power.low_beta,
        high_beta: eeg_power.high_beta,
        low_gamma: eeg_power.low_gamma,
        mid_gamma: eeg_power.high_gamma, // TGC's highGamma — renamed to match band table
        attention: esense.attention.unwrap_or(0),
        meditation: esense.meditation.unwrap_or(0),
        poor_signal_level,
    })
}
