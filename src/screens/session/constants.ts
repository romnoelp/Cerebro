export const requiredModels = [
  {
    key: "onnx" as const,
    filename: "cerebro_unified.onnx",
    label: "ONNX Inference Model",
    description: "Unified TCN+DDQN ONNX export",
    ext: "onnx",
  },
  {
    key: "scaler" as const,
    filename: "scaler_params.json",
    label: "Signal Scaler",
    description: "StandardScaler parameters (JSON)",
    ext: "json",
  },
] as const;

export type ModelKey = (typeof requiredModels)[number]["key"];
export type ModelDef = (typeof requiredModels)[number];

export const calibrationSteps = [
  "Participant seated comfortably...",
  "Checking signal integrity...",
  "Baseline calibration in progress...",
  "System ready for acquisition",
];

export const stepDuration = 1400;
