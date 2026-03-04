use std::path::PathBuf;

use crate::domain::{
    errors::AppError,
    ports::SessionRepository,
    session_summary::SessionSummary,
};

/// Concrete session persistence backed by a JSON file on disk.
/// The file path is supplied at construction time so the repository is
/// independent of the Tauri app-data directory resolution.
pub struct FileSessionRepository {
    index_path: PathBuf,
}

impl FileSessionRepository {
    pub fn new(index_path: PathBuf) -> Self {
        Self { index_path }
    }
}

impl SessionRepository for FileSessionRepository {
    fn save(&mut self, summary: SessionSummary) -> Result<(), AppError> {
        let mut registry = self.load_all()?;
        registry.push(summary);
        let serialized = serde_json::to_string_pretty(&registry)
            .map_err(|error| AppError::SerializationFailure(error.to_string()))?;
        std::fs::write(&self.index_path, serialized)
            .map_err(|error| AppError::StorageFailure(error.to_string()))
    }

    fn load_all(&self) -> Result<Vec<SessionSummary>, AppError> {
        if !self.index_path.exists() {
            return Ok(vec![]);
        }
        let raw = std::fs::read_to_string(&self.index_path)
            .map_err(|error| AppError::StorageFailure(error.to_string()))?;
        // Silently return an empty list on corrupt JSON so a bad write
        // never prevents future sessions from being saved.
        Ok(serde_json::from_str(&raw).unwrap_or_default())
    }
}
