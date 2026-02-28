use serde::{Deserialize, Serialize};

// Mirrors the TGC `eegPower` JSON object exactly.
#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RawEegPower {
    pub delta: u32,
    pub theta: u32,
    pub low_alpha: u32,
    pub high_alpha: u32,
    pub low_beta: u32,
    pub high_beta: u32,
    pub low_gamma: u32,
    pub high_gamma: u32,
}

#[derive(Debug, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct RawESense {
    pub attention: Option<u8>,
    pub meditation: Option<u8>,
}

// TGC sends many packet types; all fields are optional because any packet may
// omit fields not relevant to that update (e.g. a `poorSignalLevel` packet
// carries no `eegPower`).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TgcPacket {
    pub eeg_power: Option<RawEegPower>,
    pub e_sense: Option<RawESense>,
    pub poor_signal_level: Option<u8>,
}

// The full payload emitted as the `tgc-data` frontend event and accepted by
// the `get_focus_prediction` command. Field names match BANDS keys in the chart.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EegPayload {
    pub delta: u32,
    pub theta: u32,
    pub low_alpha: u32,
    pub high_alpha: u32,
    pub low_beta: u32,
    pub high_beta: u32,
    pub low_gamma: u32,
    pub mid_gamma: u32, // TGC's `highGamma` — renamed to match the band table
    pub attention: u8,
    pub meditation: u8,
    pub poor_signal_level: u8, // 0 = clean signal, 200 = no contact
}
