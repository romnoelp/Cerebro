use ort::session::Session;
use ort::value::Tensor;
use serde::Deserialize;

use crate::domain::{
    eeg_packet::EegPacket,
    errors::AppError,
    focus_reading::{focus_label_name, FocusReading},
    ports::InferenceRunner,
};

// Feature index of the β/θ engagement ratio in the 11-element feature vector.
// The Python training pipeline zeroes this index before training when unlabelled
// datasets are included, preventing the model from learning a trivial threshold.
// Inference must apply the same zeroing so the runtime distribution matches training.
const BETA_THETA_RATIO_FEATURE_INDEX: usize = 8;

// Matches the JSON produced by scaler_params.json (sklearn StandardScaler export).
#[derive(Debug, Deserialize)]
pub struct ScalerParams {
    pub mean_: Vec<f32>,
    pub scale_: Vec<f32>,
    #[allow(dead_code)]
    pub n_features_in_: usize,
}

/// The two file paths supplied by the user from the Model Setup card.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelFilePaths {
    pub onnx_path: String,
    pub scaler_path: String,
}

/// Concrete inference runner backed by an ONNX runtime session.
/// `prev_delta_relative` carries the previous packet's delta proportion so
/// the temporal-Δdelta feature stays coherent across successive inference calls.
pub struct OnnxInferenceRunner {
    session: Session,
    mean: Vec<f32>,
    scale: Vec<f32>,
    prev_delta_relative: f32,
}

impl OnnxInferenceRunner {
    /// To construct a live ONNX inference session and load the paired
    /// StandardScaler parameters from disk. Both files must be valid before
    /// any inference is possible.
    pub fn load(paths: &ModelFilePaths) -> Result<Self, String> {
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
}

impl InferenceRunner for OnnxInferenceRunner {
    fn predict(&mut self, packet: &EegPacket) -> Result<FocusReading, AppError> {
        let features = extract_feature_vector(packet, &mut self.prev_delta_relative);
        let mut normalized = apply_standard_scaler(&features, &self.mean, &self.scale);
        blind_beta_theta_ratio(&mut normalized);
        run_onnx_session(&mut self.session, normalized).map_err(AppError::InferenceFailure)
    }
}

// To produce the 11-element feature vector consumed by the ONNX model.
// Must stay in sync with Python's `_features_from_bands` so that the
// training distribution and runtime distribution are identical.
fn extract_feature_vector(packet: &EegPacket, prev_delta_relative: &mut f32) -> [f32; 11] {
    let absolute_powers = [
        packet.delta as f32,
        packet.theta as f32,
        packet.low_alpha as f32,
        packet.high_alpha as f32,
        packet.low_beta as f32,
        packet.high_beta as f32,
        packet.low_gamma as f32,
        packet.mid_gamma as f32,
    ];
    let band_relatives = compute_relative_powers(absolute_powers);

    let delta_relative = band_relatives[0];
    let theta = band_relatives[1];
    let alpha = band_relatives[2] + band_relatives[3];
    let beta = band_relatives[4] + band_relatives[5];

    let temporal_delta = delta_relative - *prev_delta_relative;
    *prev_delta_relative = delta_relative;

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

// DDQN requires normalized input; scaler was fitted on training data, not live signal.
// Mirrors sklearn StandardScaler.transform: (x − mean) / scale.
fn apply_standard_scaler(features: &[f32; 11], mean: &[f32], scale: &[f32]) -> Vec<f32> {
    features
        .iter()
        .enumerate()
        .map(|(index, value)| (value - mean[index]) / scale[index])
        .collect()
}

// To match the training-time feature blinding, zeroes the β/θ ratio slot so the
// model receives the same input distribution it was trained on.
fn blind_beta_theta_ratio(normalized_features: &mut Vec<f32>) {
    if let Some(slot) = normalized_features.get_mut(BETA_THETA_RATIO_FEATURE_INDEX) {
        *slot = 0.0;
    }
}

fn run_onnx_session(session: &mut Session, normalized: Vec<f32>) -> Result<FocusReading, String> {
    let input = Tensor::<f32>::from_array(([1i64, 1i64, 11i64], normalized))
        .map_err(|error: ort::Error| error.to_string())?;

    let outputs = session
        .run(ort::inputs!["eeg_stream" => input])
        .map_err(|error: ort::Error| error.to_string())?;

    let (_, predicted_class_ids) = outputs["focus_prediction"]
        .try_extract_tensor::<i64>()
        .map_err(|error: ort::Error| error.to_string())?;

    let predicted_class = *predicted_class_ids
        .first()
        .ok_or_else(|| "ONNX returned an empty output tensor".to_string())?;

    Ok(FocusReading {
        label: predicted_class,
        label_name: focus_label_name(predicted_class),
    })
}

// Divides each band power by the total so all eight values sum to 1.0.
fn compute_relative_powers(absolute_powers: [f32; 8]) -> [f32; 8] {
    let total: f32 = absolute_powers.iter().sum::<f32>() + 1e-10;
    absolute_powers.map(|band| band / total)
}
