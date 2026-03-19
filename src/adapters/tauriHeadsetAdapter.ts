import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { EegBandPowers, HeadsetConnectionStatus } from "@/domain";
import type { EegSourceConfig } from "@/use_cases/useEegListener";
import { logger } from "@/lib/logger";

// Pure async functions that wrap Tauri invoke/listen calls.
// These are the only files in the frontend that may import from @tauri-apps.
// Use cases call these functions; they never call Tauri directly.

export const startEegReader = async (
  source: EegSourceConfig,
): Promise<void> => {
  await invoke("start_esp32", { port: source.portName });
};

export const stopEegReader = async (source: EegSourceConfig): Promise<void> => {
  void source;
  await invoke("stop_esp32").catch((error) =>
    logger.ioError("stop_esp32 failed", error),
  );
};

export const subscribeToEegPackets = (
  onPacket: (packet: EegBandPowers) => void,
): Promise<UnlistenFn> =>
  listen<EegBandPowers>("eeg-data", (event) => onPacket(event.payload));

export const subscribeToHeadsetStatus = (
  onStatus: (status: HeadsetConnectionStatus) => void,
): Promise<UnlistenFn> =>
  listen<HeadsetConnectionStatus>("eeg-status", (event) =>
    onStatus(event.payload),
  );

export const listAvailableSerialPorts = (): Promise<string[]> =>
  invoke<string[]>("list_serial_ports");
