import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { sileo } from "sileo";
import {
  REQUIRED_MODEL_DEFINITIONS,
  type ModelKey,
  type ModelDefinition,
} from "./modelConfig";
import { logger } from "@/lib/logger";

const pickModelFile = async (): Promise<string | null> => {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Model Files", extensions: ["onnx", "json"] }],
  });
  return selected ? (selected as string) : null;
};

const classifySelectedFile = (
  path: string,
): { key: ModelKey; definition: ModelDefinition; filename: string } | null => {
  const filename = path.split(/[\\/]/).pop() ?? "";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const definition =
    REQUIRED_MODEL_DEFINITIONS.find((model) => model.ext === ext) ?? null;

  if (!definition) {
    sileo.error({
      title: "Unrecognized file",
      description: `"${filename}" must be .onnx or .json`,
    });
    return null;
  }

  return { key: definition.key, definition, filename };
};

// ── Store ─────────────────────────────────────────────────────────────────────

interface ModelLoadingStore {
  stagedModelMap: Record<ModelKey, boolean>;
  /** OS paths accumulated until both are known, then forwarded to the backend. */
  pendingPaths: Record<ModelKey, string | null>;
  modelReady: boolean;
  handleLoadModel: () => Promise<void>;
  /** Resets all model state (e.g. after a fatal load error). */
  resetModels: () => void;
}

const initialModelLoadingState = {
  stagedModelMap: { onnx: false, scaler: false } as Record<ModelKey, boolean>,
  pendingPaths: { onnx: null, scaler: null } as Record<ModelKey, string | null>,
  modelReady: false,
};

export const useModelStore = create<ModelLoadingStore>((set, get) => ({
  ...initialModelLoadingState,

  handleLoadModel: async () => {
    try {
      const selectedPath = await pickModelFile();
      if (!selectedPath) return;

      const classified = classifySelectedFile(selectedPath);
      if (!classified) return;

      const { stagedModelMap, pendingPaths } = get();

      if (stagedModelMap[classified.key]) {
        sileo.info({
          title: `${classified.definition.label} already registered`,
          description: "Pick the other file, or restart to swap it.",
        });
        return;
      }

      const updatedStagedMap = { ...stagedModelMap, [classified.key]: true };
      const updatedPaths = { ...pendingPaths, [classified.key]: selectedPath };
      set({ stagedModelMap: updatedStagedMap, pendingPaths: updatedPaths });

      if (Object.values(updatedStagedMap).every(Boolean)) {
        // Both models staged — activate the ONNX session on the backend.
        await invoke("load_model_files", {
          paths: {
            onnxPath: updatedPaths.onnx!,
            scalerPath: updatedPaths.scaler!,
          },
        });
        set({ modelReady: true });
        sileo.success({
          title: "All models loaded",
          description: "ONNX session is live. Session can now be started.",
        });
      } else {
        sileo.success({
          title: `${classified.definition.label} registered`,
          description: classified.filename,
        });
      }
    } catch (error) {
      // Stale paths must not persist — a partial load would silently produce
      // wrong inference if the user retries with a different file.
      set(initialModelLoadingState);
      logger.ioError("Model activation failed", error);
      sileo.error({
        title: "Failed to load models",
        description: String(error),
      });
    }
  },

  resetModels: () => set(initialModelLoadingState),
}));
