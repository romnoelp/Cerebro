use serde::Serialize;

// Discriminated output from one TCN+DDQN inference pass over a single EEG packet.
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FocusReading {
    pub label: i64,         // 0 = Unfocused, 1 = Focused
    pub label_name: String, // Human-readable label forwarded to the UI
}

// To map a raw ONNX class index to its human-readable focus label.
pub fn focus_label_name(predicted_class: i64) -> String {
    if predicted_class == 1 {
        "Focused".to_string()
    } else {
        "Unfocused".to_string()
    }
}
