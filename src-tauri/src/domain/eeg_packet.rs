use serde::{Deserialize, Serialize};

// One complete EEG measurement: eight frequency-band powers plus two eSense
// metrics and a signal quality indicator. Emitted at ~1 Hz by both the TGC
// TCP adapter and the ESP32 serial adapter.
// Field names match the serde output consumed by the frontend `tgc-data` event.
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

// ThinkGear Connector raw JSON sub-object — used only by the TGC packet parser.
#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RawTgcEegPower {
    pub delta: u32,
    pub theta: u32,
    pub low_alpha: u32,
    pub high_alpha: u32,
    pub low_beta: u32,
    pub high_beta: u32,
    pub low_gamma: u32,
    pub high_gamma: u32, // TGC naming — remapped to mid_gamma in EegPacket
}

#[derive(Debug, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct RawTgcEsense {
    pub attention: Option<u8>,
    pub meditation: Option<u8>,
}

// TGC emits many packet variants; all fields are optional because heartbeat
// packets omit band powers and status packets omit eSense values.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawTgcPacket {
    pub eeg_power: Option<RawTgcEegPower>,
    pub e_sense: Option<RawTgcEsense>,
    pub poor_signal_level: Option<u8>,
}
