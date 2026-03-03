export const loadingSteps = [
  "Building new session...",
  "Analyzing signals...",
  "Requirements complete...",
  "Connections established!",
] as const;

// ms between each loading step advancing
export const stepDuration = 1400;
// ms after the last step resolves before transitioning to session
export const fadeToSessionDelay = 800;
