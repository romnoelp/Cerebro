import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { sileo } from "sileo";
import { requiredModels, ModelKey } from "../constants";

export const useModelLoader = () => {
  const [loadedModels, setLoadedModels] = useState<Record<ModelKey, boolean>>({
    ddqn: false,
    tcn: false,
    scaler: false,
  });

  const allLoaded = Object.values(loadedModels).every(Boolean);

  const handleLoadModel = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Model Files", extensions: ["pt", "pkl"] }],
      });

      if (!selected) return;

      const path = selected as string;
      const filename = path.split(/[\\/]/).pop() ?? "";

      const match = requiredModels.find((m) => m.filename === filename);

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

      if (nowAllLoaded) {
        sileo.success({
          title: "All models loaded",
          description: "Session can now be started.",
        });
      } else {
        sileo.success({
          title: `${match.label} loaded`,
          description: match.filename,
        });
      }
    } catch {
      sileo.error({
        title: "Failed to open file",
        description: "An error occurred while opening the file dialog.",
      });
    }
  };

  return { loadedModels, allLoaded, handleLoadModel };
};
