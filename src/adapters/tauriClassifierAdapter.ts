import { invoke } from "@tauri-apps/api/core";
import type {
  EegBandPowers,
  FocusReading,
  FocusClassifierPort,
} from "@/domain";

// Concrete implementation of FocusClassifierPort backed by the Tauri ONNX command.
export const createTauriClassifier = (): FocusClassifierPort => ({
  classify: (packet: EegBandPowers): Promise<FocusReading> =>
    invoke<FocusReading>("get_focus_prediction", { payload: packet }),
});
