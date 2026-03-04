use crate::domain::{
    errors::AppError,
    ports::SessionRepository,
    session_summary::SessionSummary,
};

/// To append a completed session summary to the persistent store.
pub fn persist_session_summary(
    summary: SessionSummary,
    repository: &mut impl SessionRepository,
) -> Result<(), AppError> {
    repository.save(summary)
}

/// To retrieve all previously saved session summaries from the persistent store.
pub fn load_session_summaries(
    repository: &impl SessionRepository,
) -> Result<Vec<SessionSummary>, AppError> {
    repository.load_all()
}
