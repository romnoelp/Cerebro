use std::fmt;

#[derive(Debug)]
pub enum AppError {
    InferenceFailure(String),
    StorageFailure(String),
    SerializationFailure(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::InferenceFailure(message) => write!(f, "Inference error: {message}"),
            AppError::StorageFailure(message) => write!(f, "Storage error: {message}"),
            AppError::SerializationFailure(message) => {
                write!(f, "Serialization error: {message}")
            }
        }
    }
}

impl From<AppError> for String {
    fn from(error: AppError) -> String {
        error.to_string()
    }
}
