import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { sileo } from "sileo";
import { requiredModels, ModelKey } from "../constants";

// Specialist: opens the OS file picker and returns the selected path.
async function pickModelFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Model Files", extensions: ["pt", "pkl"] }],
  });
  return selected ? (selected as string) : null;
}

// Specialist: extracts the bare filename from a full OS path.
function extractFilename(path: string): string {
  return path.split(/[\\/]/).pop() ?? "";
}

// Specialist: finds a required model definition by its filename.
function findModelByFilename(filename: string) {
  return requiredModels.find((m) => m.filename === filename) ?? null;
}

// Specialist: fires the appropriate success notification after registration.
function notifyModelRegistered(
  label: string,
  filename: string,
  nowAllLoaded: boolean,
): void {
  if (nowAllLoaded) {
    sileo.success({
      title: "All models loaded",
      description: "Session can now be started.",
    });
  } else {
    sileo.success({ title: `${label} loaded`, description: filename });
  }
}

export const useModelLoader = () => {
  const [loadedModels, setLoadedModels] = useState<Record<ModelKey, boolean>>({
    ddqn: false,
    tcn: false,
    scaler: false,
  });

  const allLoaded = Object.values(loadedModels).every(Boolean);

  const handleLoadModel = async () => {
    try {
      const path = await pickModelFile();
      if (!path) return;

      const filename = extractFilename(path);
      const match = findModelByFilename(filename);

      if (!match) {
        sileo.error({
          title: "Unrecognized model file",
          description: `"${filename}" is not a required model file.`,
        });
        return;
      }

      if (loadedModels[match.key]) {
        sileo.info({
          title: `${match.label} already loaded`,
          description: "This model is already registered.",
        });
        return;
      }

      const next = { ...loadedModels, [match.key]: true };
      setLoadedModels(next);

      const nowAllLoaded = Object.values(next).every(Boolean);
      notifyModelRegistered(match.label, match.filename, nowAllLoaded);
    } catch {
      sileo.error({
        title: "Failed to open file",
        description: "An error occurred while opening the file dialog.",
      });
    }
  };

  return { loadedModels, allLoaded, handleLoadModel };
};
