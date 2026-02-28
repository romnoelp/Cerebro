import { useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { sileo } from "sileo";
import { requiredModels, ModelDef, ModelKey } from "../constants";

// ── Pure helpers ──────────────────────────────────────────────────────────────

const pickModelFile = async (): Promise<string | null> => {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Model Files", extensions: ["onnx", "json"] }],
  });
  return selected ? (selected as string) : null;
}

const classifyFile = (path: string): { key: ModelKey; model: ModelDef; filename: string } | null => {
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
}

const notifyAlreadyRegistered = (model: ModelDef) => {
  sileo.info({
    title: `${model.label} already registered`,
    description: "Pick the other file, or restart to swap it.",
  });
}

const notifyStaged = (model: ModelDef, filename: string) => {
  sileo.success({ title: `${model.label} registered`, description: filename });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useModelLoader = () => {
  const [staged, setStaged] = useState<Record<ModelKey, boolean>>({
    onnx: false,
    scaler: false,
  });
  // Accumulates OS paths until both are known, then hands them to the backend.
  const pathsRef = useRef<Record<ModelKey, string | null>>({ onnx: null, scaler: null });
  // Becomes true only after the backend confirms the ONNX session is live.
  const [modelReady, setModelReady] = useState(false);

  // Records the file's path in the ref and marks it staged in state.
  // Returns the resulting staged map so callers can inspect it immediately
  // without waiting for the next render.
  const stageFile = (key: ModelKey, path: string): Record<ModelKey, boolean> => {
    pathsRef.current = { ...pathsRef.current, [key]: path };
    const updatedStaged = { ...staged, [key]: true };
    setStaged(updatedStaged);
    return updatedStaged;
  }

  const activateModel = async (paths: Record<ModelKey, string | null>) => {
    await invoke("load_model_files", {
      paths: { onnxPath: paths.onnx!, scalerPath: paths.scaler! },
    });
    setModelReady(true);
    sileo.success({
      title: "All models loaded",
      description: "ONNX session is live. Session can now be started.",
    });
  }

  const rollback = (err: unknown) => {
    // Stale paths must not persist — a partial load would silently produce
    // wrong inference if the user retries with a different file.
    setStaged({ onnx: false, scaler: false });
    pathsRef.current = { onnx: null, scaler: null };
    setModelReady(false);
    sileo.error({ title: "Failed to load models", description: String(err) });
  }

  const handleLoadModel = async () => {
    try {
      const path = await pickModelFile();
      if (!path) return;

      const classified = classifyFile(path);
      if (!classified) return;

      if (staged[classified.key]) {
        notifyAlreadyRegistered(classified.model);
        return;
      }

      const updatedStaged = stageFile(classified.key, path);

      if (Object.values(updatedStaged).every(Boolean)) {
        await activateModel(pathsRef.current);
      } else {
        notifyStaged(classified.model, classified.filename);
      }
    } catch (err) {
      rollback(err);
    }
  };

  return { loadedModels: staged, modelReady, handleLoadModel };
};
