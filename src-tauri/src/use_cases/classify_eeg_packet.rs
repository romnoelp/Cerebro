use crate::domain::{
    eeg_packet::EegPacket,
    errors::AppError,
    focus_reading::FocusReading,
    ports::InferenceRunner,
};

/// To produce a focus label for one EEG packet without knowledge of the
/// concrete inference backend. The caller supplies a runner so this function
/// is testable independently of the ONNX runtime.
pub fn classify_eeg_packet(
    packet: &EegPacket,
    runner: &mut impl InferenceRunner,
) -> Result<FocusReading, AppError> {
    runner.predict(packet)
}
