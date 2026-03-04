use serde::{Deserialize, Serialize};

// Compact summary persisted to sessions.json after each export.
// Contains pre-computed aggregates so the dashboard never re-reads CSV files.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
    pub id: String,
    pub subject_name: String,
    pub exported_at: String, // ISO 8601
    pub csv_path: String,
    pub sample_count: u32,
    pub duration_secs: f64,
    pub focused_count: u32,
    pub unfocused_count: u32,
    pub mean_alpha: f64,
    pub mean_theta: f64,
    pub mean_attention: f64,
    pub mean_meditation: f64,
    pub signal_quality_pct: f64, // % of rows where poorSignalLevel === 0
}
