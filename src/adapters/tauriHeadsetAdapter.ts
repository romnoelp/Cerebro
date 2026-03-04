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
  if (source.type === "esp32") {
    await invoke("start_esp32", { port: source.portName });
  } else {
    await invoke("start_tgc");
  }
};

export const stopEegReader = async (source: EegSourceConfig): Promise<void> => {
  if (source.type === "esp32") {
    await invoke("stop_esp32").catch((error) =>
      logger.ioError("stop_esp32 failed", error),
    );
  } else {
    await invoke("stop_tgc").catch((error) =>
      logger.ioError("stop_tgc failed", error),
    );
  }
};

export const subscribeToEegPackets = (
  onPacket: (packet: EegBandPowers) => void,
): Promise<UnlistenFn> =>
  listen<EegBandPowers>("tgc-data", (event) => onPacket(event.payload));

export const subscribeToHeadsetStatus = (
  onStatus: (status: HeadsetConnectionStatus) => void,
): Promise<UnlistenFn> =>
  listen<HeadsetConnectionStatus>("tgc-status", (event) =>
    onStatus(event.payload),
  );

export const listAvailableSerialPorts = (): Promise<string[]> =>
  invoke<string[]>("list_serial_ports");
