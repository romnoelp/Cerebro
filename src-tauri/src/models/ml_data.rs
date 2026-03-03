use ort::session::Session;
use ort::value::Tensor;
use serde::{Deserialize, Serialize};

use crate::models::tgc_data::EegPayload;

// Matches the JSON produced by scaler_params.json (sklearn StandardScaler export).
#[derive(Debug, Deserialize)]
pub struct ScalerParams {
    pub mean_: Vec<f32>,
    pub scale_: Vec<f32>,
    #[allow(dead_code)]
    pub n_features_in_: usize,
}

/// The two file paths the user picks from the Model Setup card.
/// Deserialized from the `load_model_files` Tauri command payload.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPaths {
    pub onnx_path: String,
    pub scaler_path: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct FocusPrediction {
    pub label: i64, // 0 = Unfocused, 1 = Focused
    pub label_name: String,
}

// Owns the ONNX session and the normalisation parameters loaded by the user.
// `prev_delta_relative` carries the previous packet's delta proportion so the
// temporal-Δdelta feature stays coherent across successive calls to `infer`.
pub struct ModelManager {
    session: Session,
    mean: Vec<f32>,
    scale: Vec<f32>,
    prev_delta_relative: f32,
}

impl ModelManager {
    /// To construct a live ONNX inference session and load the paired
    /// StandardScaler parameters from disk. Both files must be valid before
    /// any inference is possible.
    pub fn load(paths: &ModelPaths) -> Result<Self, String> {
        let session = Session::builder()
            .map_err(|error: ort::Error| error.to_string())?
            .commit_from_file(&paths.onnx_path)
            .map_err(|error: ort::Error| format!("Failed to load ONNX model: {error}"))?;

        let scaler_json = std::fs::read_to_string(&paths.scaler_path)
            .map_err(|error| format!("Cannot read scaler: {error}"))?;
        let params: ScalerParams = serde_json::from_str(&scaler_json)
            .map_err(|error| format!("Bad scaler JSON: {error}"))?;

        Ok(Self {
            session,
            mean: params.mean_,
            scale: params.scale_,
            prev_delta_relative: 0.0,
        })
    }

    /// To run a single inference pass on one EEG packet. Must be called in
    /// packet-arrival order because it mutates `prev_delta_relative` to
    /// maintain the temporal-delta feature across consecutive windows.
    pub fn infer(&mut self, payload: &EegPayload) -> Result<FocusPrediction, String> {
        let features = self.extract_features(payload);
        let normalised = self.normalise(&features);
        self.run_session(normalised)
    }

    // To produce the 11-element feature vector consumed by the ONNX model.
    // Must stay in sync with Python’s `_features_from_bands` so that the
    // training distribution and runtime distribution are identical.
    fn extract_features(&mut self, payload: &EegPayload) -> [f32; 11] {
        let absolute_powers = [
            payload.delta as f32,
            payload.theta as f32,
            payload.low_alpha as f32,
            payload.high_alpha as f32,
            payload.low_beta as f32,
            payload.high_beta as f32,
            payload.low_gamma as f32,
            payload.mid_gamma as f32,
        ];
        let band_relatives = relative_powers(absolute_powers);

        let delta_relative = band_relatives[0];
        let theta = band_relatives[1];
        let alpha = band_relatives[2] + band_relatives[3];
        let beta = band_relatives[4] + band_relatives[5];

        let temporal_delta = delta_relative - self.prev_delta_relative;
        self.prev_delta_relative = delta_relative;

        [
            band_relatives[0],
            band_relatives[1],
            band_relatives[2],
            band_relatives[3],
            band_relatives[4],
            band_relatives[5],
            band_relatives[6],
            band_relatives[7],
            beta / (theta + 1e-10), // β/θ ratio: rises when attention is high
            alpha / (beta + 1e-10), // α/β ratio: rises during relaxation
            temporal_delta,         // Δdelta: stationarity marker across windows
        ]
    }

    // Mirrors sklearn StandardScaler.transform: (x − mean) / scale.
    fn normalise(&self, features: &[f32; 11]) -> Vec<f32> {
        features
            .iter()
            .enumerate()
            .map(|(feature_index, value)| {
                (value - self.mean[feature_index]) / self.scale[feature_index]
            })
            .collect()
    }

    fn run_session(&mut self, normalised: Vec<f32>) -> Result<FocusPrediction, String> {
        let input = Tensor::<f32>::from_array(([1i64, 1i64, 11i64], normalised))
            .map_err(|error: ort::Error| error.to_string())?;

        let outputs = self
            .session
            .run(ort::inputs!["eeg_stream" => input])
            .map_err(|error: ort::Error| error.to_string())?;

        let (_, predicted_class_ids) = outputs["focus_prediction"]
            .try_extract_tensor::<i64>()
            .map_err(|error: ort::Error| error.to_string())?;

        let predicted_class = *predicted_class_ids
            .first()
            .ok_or_else(|| "ONNX returned an empty output tensor".to_string())?;

        Ok(FocusPrediction {
            label: predicted_class,
            label_name: focus_label_name(predicted_class),
        })
    }
}

// To assign a human-readable focus label to a raw ONNX class index.
fn focus_label_name(predicted_class: i64) -> String {
    if predicted_class == 1 {
        "Focused".to_string()
    } else {
        "Unfocused".to_string()
    }
}

// Divides each band power by the total so all eight values sum to 1.0.
fn relative_powers(absolute_powers: [f32; 8]) -> [f32; 8] {
    let total: f32 = absolute_powers.iter().sum::<f32>() + 1e-10;
    absolute_powers.map(|band| band / total)
}
