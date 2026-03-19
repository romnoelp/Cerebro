use serde::{Deserialize, Serialize};

// One complete EEG measurement: eight frequency-band powers plus two eSense
// metrics and a signal quality indicator, emitted at ~1 Hz by the ESP32 serial adapter.
// Field names match the serde output consumed by the frontend `eeg-data` event.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EegPacket {
    pub delta: u32,
    pub theta: u32,
    pub low_alpha: u32,
    pub high_alpha: u32,
    pub low_beta: u32,
    pub high_beta: u32,
    pub low_gamma: u32,
    pub mid_gamma: u32,
    pub attention: u8,
    pub meditation: u8,
    pub poor_signal_level: u8, // 0 = perfect signal, 200 = no electrode contact
}
