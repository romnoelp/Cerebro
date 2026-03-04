// Re-exported from their canonical adapter/use-case locations.
// Prefer importing directly from @/adapters/modelConfig or @/use_cases/useCalibration.
export {
  REQUIRED_MODEL_DEFINITIONS as requiredModels,
  type ModelKey,
  type ModelDefinition as ModelDef,
} from "@/adapters/modelConfig";

export { CALIBRATION_STEP_LABELS as calibrationSteps } from "@/use_cases/useCalibration";

export const stepDuration = 1400;
