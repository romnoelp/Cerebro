export const LOADING_STEPS = [
  "Building new session...",
  "Analyzing signals...",
  "Requirements complete...",
  "Connections established!",
] as const;

// ms between each loading step advancing
export const STEP_DURATION = 1400;
// ms after the last step resolves before transitioning to session
export const FADE_TO_SESSION_DELAY = 800;
