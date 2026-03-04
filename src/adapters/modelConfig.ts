// Model configuration constants for the Model Setup workflow.
// Describes the two concrete file artifacts the user must supply before inference.
export const REQUIRED_MODEL_DEFINITIONS = [
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

export type ModelKey = (typeof REQUIRED_MODEL_DEFINITIONS)[number]["key"];
export type ModelDefinition = (typeof REQUIRED_MODEL_DEFINITIONS)[number];
