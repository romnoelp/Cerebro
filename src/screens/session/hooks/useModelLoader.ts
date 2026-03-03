import { useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { sileo } from "sileo";
import { requiredModels, ModelDef, ModelKey } from "../constants";
import { logger } from "@/lib/logger";

// ── Pure helpers ──────────────────────────────────────────────────────────────

const pickModelFile = async (): Promise<string | null> => {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Model Files", extensions: ["onnx", "json"] }],
  });
  return selected ? (selected as string) : null;
};

const classifyFile = (
  path: string,
): { key: ModelKey; model: ModelDef; filename: string } | null => {
  const filename = path.split(/[\\/]/).pop() ?? "";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const model = requiredModels.find((m) => m.ext === ext) ?? null;

  if (!model) {
    sileo.error({
      title: "Unrecognized file",
      description: `"${filename}" must be .onnx or .json`,
    });
    return null;
  }

  return { key: model.key, model, filename };
};

const notifyAlreadyRegistered = (model: ModelDef) => {
  sileo.info({
    title: `${model.label} already registered`,
    description: "Pick the other file, or restart to swap it.",
  });
};

const notifyStaged = (model: ModelDef, filename: string) => {
  sileo.success({ title: `${model.label} registered`, description: filename });
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useModelLoader = () => {
  const [stagedModelMap, setStagedModelMap] = useState<
    Record<ModelKey, boolean>
  >({
    onnx: false,
    scaler: false,
  });
  // Accumulates OS paths until both are known, then forwards them to the backend.
  const pendingModelPathsRef = useRef<Record<ModelKey, string | null>>({
    onnx: null,
    scaler: null,
  });
  const [modelReady, setModelReady] = useState(false);

  // To record the file path and mark the slot staged. Returns the updated map
  // immediately so the caller can check completeness without waiting for a render.
  const stageFile = (
    key: ModelKey,
    path: string,
  ): Record<ModelKey, boolean> => {
    pendingModelPathsRef.current = {
      ...pendingModelPathsRef.current,
      [key]: path,
    };
    const updatedStagedMap = { ...stagedModelMap, [key]: true };
    setStagedModelMap(updatedStagedMap);
    return updatedStagedMap;
  };

  const activateModel = async (
    pendingPaths: Record<ModelKey, string | null>,
  ) => {
    await invoke("load_model_files", {
      paths: { onnxPath: pendingPaths.onnx!, scalerPath: pendingPaths.scaler! },
    });
    setModelReady(true);
    sileo.success({
      title: "All models loaded",
      description: "ONNX session is live. Session can now be started.",
    });
  };

  const rollbackPartialModelLoad = (error: unknown) => {
    // Stale paths must not persist — a partial load would silently produce
    // wrong inference if the user retries with a different file.
    setStagedModelMap({ onnx: false, scaler: false });
    pendingModelPathsRef.current = { onnx: null, scaler: null };
    setModelReady(false);
    logger.ioError("Model activation failed", error);
    sileo.error({ title: "Failed to load models", description: String(error) });
  };

  const handleLoadModel = async () => {
    try {
      const selectedPath = await pickModelFile();
      if (!selectedPath) return;

      const classified = classifyFile(selectedPath);
      if (!classified) return;

      if (stagedModelMap[classified.key]) {
        notifyAlreadyRegistered(classified.model);
        return;
      }

      const updatedStagedMap = stageFile(classified.key, selectedPath);

      if (Object.values(updatedStagedMap).every(Boolean)) {
        await activateModel(pendingModelPathsRef.current);
      } else {
        notifyStaged(classified.model, classified.filename);
      }
    } catch (error) {
      rollbackPartialModelLoad(error);
    }
  };

  return { loadedModels: stagedModelMap, modelReady, handleLoadModel };
};
