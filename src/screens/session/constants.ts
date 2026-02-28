export const requiredModels = [
  {
    key: "ddqn" as const,
    filename: "ddqn_best_checkpoint.pt",
    label: "DDQN Policy Model",
    description: "Deep Q-Network decision model",
  },
  {
    key: "tcn" as const,
    filename: "tcn_best_checkpoint.pt",
    label: "TCN Feature Extractor",
    description: "Temporal Convolutional Network",
  },
  {
    key: "scaler" as const,
    filename: "scaler.pkl",
    label: "Signal Scaler",
    description: "EEG signal preprocessing scaler",
  },
] as const;

export const calibrationSteps = [
  "Participant seated comfortably...",
  "Checking signal integrity...",
  "Baseline calibration in progress...",
  "System ready for acquisition",
];

export const stepDuration = 1400;

export type ModelKey = (typeof requiredModels)[number]["key"];
