use crate::domain::{
    eeg_packet::EegPacket, errors::AppError, focus_reading::FocusReading,
    session_summary::SessionSummary,
};

// Every external capability the use-case layer needs is expressed as a trait
// here. Concrete implementations live in adapters/ and are injected at the
// infrastructure boundary — use cases never import adapters/ directly.

pub trait InferenceRunner {
    /// To produce a focus label for one EEG packet without knowledge of the
    /// underlying ONNX runtime. Mutates self because the temporal-delta
    /// feature requires state across successive calls.
    fn predict(&mut self, packet: &EegPacket) -> Result<FocusReading, AppError>;
}

pub trait SessionRepository {
    /// To append a completed session summary to the persistent index.
    fn save(&mut self, summary: SessionSummary) -> Result<(), AppError>;

    /// To return all previously saved session summaries, or an empty
    /// collection when no sessions have been recorded yet.
    fn load_all(&self) -> Result<Vec<SessionSummary>, AppError>;
}
