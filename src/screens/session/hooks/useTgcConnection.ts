import * as React from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { type TgcBandData, type TgcStatus } from "@/types";

/** Selects where EEG data comes from. */
export type EegSource = { type: "tgc" } | { type: "esp32"; port: string };

interface UseTgcConnectionResult {
  liveData: TgcBandData | undefined; // normalized (%) for the chart
  rawData: TgcBandData | undefined; // absolute μV² values for CSV recording
  isConnected: boolean;
  poorSignalLevel: number; // 0 = clean, 200 = no contact
}

// Specialist: converts raw μV² band powers to relative percentages (0–100).
function normalizeBandPowers(payload: TgcBandData): TgcBandData {
  const {
    delta,
    theta,
    lowAlpha,
    highAlpha,
    lowBeta,
    highBeta,
    lowGamma,
    midGamma,
  } = payload;
  const total =
    delta +
      theta +
      lowAlpha +
      highAlpha +
      lowBeta +
      highBeta +
      lowGamma +
      midGamma || 1;
  return {
    ...payload,
    delta: Math.round((delta / total) * 100),
    theta: Math.round((theta / total) * 100),
    lowAlpha: Math.round((lowAlpha / total) * 100),
    highAlpha: Math.round((highAlpha / total) * 100),
    lowBeta: Math.round((lowBeta / total) * 100),
    highBeta: Math.round((highBeta / total) * 100),
    lowGamma: Math.round((lowGamma / total) * 100),
    midGamma: Math.round((midGamma / total) * 100),
  };
}

/**
 * Starts/stops the data reader (TGC TCP or ESP32 serial) based on `active`
 * and exposes normalized band power data via `liveData`.
 * Both backends emit the same `tgc-data` / `tgc-status` events, so the
 * frontend hook is source-agnostic beyond the start/stop commands.
 * Packets with poorSignalLevel ≥ 50 are dropped.
 */
export function useTgcConnection(
  active: boolean,
  source: EegSource = { type: "tgc" },
): UseTgcConnectionResult {
  const [liveData, setLiveData] = React.useState<TgcBandData | undefined>(
    undefined,
  );
  const [rawData, setRawData] = React.useState<TgcBandData | undefined>(
    undefined,
  );
  const [isConnected, setIsConnected] = React.useState(false);
  const [poorSignalLevel, setPoorSignalLevel] = React.useState(200);

  // Extract primitives for the dependency array — avoids object reference churn.
  const sourceType = source.type;
  const esp32Port = source.type === "esp32" ? source.port : "";

  React.useEffect(() => {
    const startCmd =
      sourceType === "esp32"
        ? invoke("start_esp32", { port: esp32Port })
        : invoke("start_tgc");
    const stopCmd = () =>
      sourceType === "esp32"
        ? invoke("stop_esp32").catch(console.error)
        : invoke("stop_tgc").catch(console.error);

    if (!active) {
      stopCmd();
      setLiveData(undefined);
      setRawData(undefined);
      setIsConnected(false);
      setPoorSignalLevel(200);
      return;
    }

    startCmd.catch(console.error);

    let unlistenData: UnlistenFn | undefined;
    let unlistenStatus: UnlistenFn | undefined;

    // ~1 Hz from TGAM chip; delivers raw band powers, normalized on acceptance.
    listen<TgcBandData>("tgc-data", (event) => {
      const payload = event.payload;
      setPoorSignalLevel(payload.poorSignalLevel);
      if (payload.poorSignalLevel < 50) {
        setRawData(payload);
        setLiveData(normalizeBandPowers(payload));
      }
    })
      .then((fn) => {
        unlistenData = fn;
      })
      .catch(console.error);

    listen<TgcStatus>("tgc-status", (event) => {
      setIsConnected(event.payload === "connected");
      if (event.payload === "disconnected") {
        setLiveData(undefined);
        setRawData(undefined);
      }
    })
      .then((fn) => {
        unlistenStatus = fn;
      })
      .catch(console.error);

    return () => {
      unlistenData?.();
      unlistenStatus?.();
      stopCmd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, sourceType, esp32Port]);

  return { liveData, rawData, isConnected, poorSignalLevel };
}
