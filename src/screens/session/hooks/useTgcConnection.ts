import * as React from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { type TgcBandData, type TgcStatus } from "@/types";

interface UseTgcConnectionResult {
  liveData: TgcBandData | undefined; // undefined when disconnected or signal is poor
  isConnected: boolean;
  poorSignalLevel: number; // 0 = clean, 200 = no contact
}

/**
 * Starts/stops the Rust TGC reader based on `active` and exposes normalized
 * band power data via `liveData`. Packets with poorSignalLevel ≥ 50 are dropped.
 */
export function useTgcConnection(active: boolean): UseTgcConnectionResult {
  const [liveData, setLiveData] = React.useState<TgcBandData | undefined>(
    undefined,
  );
  const [isConnected, setIsConnected] = React.useState(false);
  const [poorSignalLevel, setPoorSignalLevel] = React.useState(200);

  React.useEffect(() => {
    if (!active) {
        invoke("stop_tgc").catch(console.error);
      setLiveData(undefined);
      setIsConnected(false);
      setPoorSignalLevel(200);
      return;
    }

    invoke("start_tgc").catch(console.error);

    let unlistenData: UnlistenFn | undefined;
    let unlistenStatus: UnlistenFn | undefined;

    // ~1 Hz from TGAM chip; normalize raw band powers to relative % (0–100).
    listen<TgcBandData>("tgc-data", (event) => {
      const payload = event.payload;
      setPoorSignalLevel(payload.poorSignalLevel);
      if (payload.poorSignalLevel < 50) {
        const {
          delta, theta, lowAlpha, highAlpha,
          lowBeta, highBeta, lowGamma, midGamma,
        } = payload;
        const total =
          delta + theta + lowAlpha + highAlpha +
          lowBeta + highBeta + lowGamma + midGamma || 1;
        const normalized: TgcBandData = {
          ...payload,
          delta:     Math.round((delta     / total) * 100),
          theta:     Math.round((theta     / total) * 100),
          lowAlpha:  Math.round((lowAlpha  / total) * 100),
          highAlpha: Math.round((highAlpha / total) * 100),
          lowBeta:   Math.round((lowBeta   / total) * 100),
          highBeta:  Math.round((highBeta  / total) * 100),
          lowGamma:  Math.round((lowGamma  / total) * 100),
          midGamma:  Math.round((midGamma  / total) * 100),
        };
        setLiveData(normalized);
      }
    })
      .then((fn) => { unlistenData = fn; })
      .catch(console.error);

    listen<TgcStatus>("tgc-status", (event) => {
      setIsConnected(event.payload === "connected");
      if (event.payload === "disconnected") setLiveData(undefined);
    })
      .then((fn) => { unlistenStatus = fn; })
      .catch(console.error);

    return () => {
      unlistenData?.();
      unlistenStatus?.();
      invoke("stop_tgc").catch(console.error);
    };
  }, [active]);

  return { liveData, isConnected, poorSignalLevel };
}
