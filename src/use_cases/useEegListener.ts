import * as React from "react";
import type { EegBandPowers, HeadsetConnectionStatus } from "@/domain";
import {
  startEegReader,
  stopEegReader,
  subscribeToEegPackets,
  subscribeToHeadsetStatus,
} from "@/adapters/tauriHeadsetAdapter";
import { logger } from "@/lib/logger";

export type EegSourceConfig =
  | { type: "tgc" }
  | { type: "esp32"; portName: string };

const POOR_SIGNAL_REJECTION_THRESHOLD = 50;

// If no EEG packet arrives within this window while the reader is active,
// the headset has likely powered off (ESP32 stays connected via USB but stops
// emitting JSON when its Bluetooth link to the headset drops). We synthesize
// poorSignalLevel = 200 so the signal monitor can react without waiting for a
// packet that will never come.
const PACKET_TIMEOUT_MS = 2500;

// To convert raw µV² band powers to relative percentages (0–100) so the
// chart always sums to 100% regardless of absolute power magnitude.
const computeRelativeBandPowers = (packet: EegBandPowers): EegBandPowers => {
  const {
    delta,
    theta,
    lowAlpha,
    highAlpha,
    lowBeta,
    highBeta,
    lowGamma,
    midGamma,
  } = packet;
  const totalPower =
    delta +
      theta +
      lowAlpha +
      highAlpha +
      lowBeta +
      highBeta +
      lowGamma +
      midGamma || 1;
  return {
    ...packet,
    delta: Math.round((delta / totalPower) * 100),
    theta: Math.round((theta / totalPower) * 100),
    lowAlpha: Math.round((lowAlpha / totalPower) * 100),
    highAlpha: Math.round((highAlpha / totalPower) * 100),
    lowBeta: Math.round((lowBeta / totalPower) * 100),
    highBeta: Math.round((highBeta / totalPower) * 100),
    lowGamma: Math.round((lowGamma / totalPower) * 100),
    midGamma: Math.round((midGamma / totalPower) * 100),
  };
};

interface EegListenerResult {
  /** Relative (%) band powers — suitable for chart display. */
  displayBandPowers: EegBandPowers | undefined;
  /** Absolute µV² band powers — used for CSV recording and inference. */
  rawBandPowers: EegBandPowers | undefined;
  isConnected: boolean;
  poorSignalLevel: number;
}

/**
 * Starts and stops the EEG data reader based on `active` and exposes
 * normalized band power data. Packets with poorSignalLevel ≥ 50 are dropped.
 * Both TGC and ESP32 backends emit the same event names, so this hook is
 * source-agnostic beyond the start/stop commands.
 */
export const useEegListener = (
  active: boolean,
  source: EegSourceConfig = { type: "tgc" },
): EegListenerResult => {
  const [displayBandPowers, setDisplayBandPowers] = React.useState<
    EegBandPowers | undefined
  >(undefined);
  const [rawBandPowers, setRawBandPowers] = React.useState<
    EegBandPowers | undefined
  >(undefined);
  const [isConnected, setIsConnected] = React.useState(false);
  const [poorSignalLevel, setPoorSignalLevel] = React.useState(200);

  // Watchdog: reset on every packet; fires PACKET_TIMEOUT_MS after the last
  // one, synthesizing poorSignalLevel = 200 so the signal monitor detects the
  // silence even though the serial port is still open.
  const watchdogRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetWatchdog = React.useCallback(() => {
    if (watchdogRef.current !== null) clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      setPoorSignalLevel(200);
    }, PACKET_TIMEOUT_MS);
  }, []);

  const clearWatchdog = React.useCallback(() => {
    if (watchdogRef.current !== null) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  // Extract primitives for the dependency array — avoids object reference churn.
  const sourceType = source.type;
  const esp32PortName = source.type === "esp32" ? source.portName : "";

  React.useEffect(() => {
    const stopReader = () =>
      stopEegReader(source).catch((error) =>
        logger.ioError("EEG reader stop failed", error),
      );

    if (!active) {
      stopReader();
      clearWatchdog();
      setDisplayBandPowers(undefined);
      setRawBandPowers(undefined);
      setIsConnected(false);
      setPoorSignalLevel(200);
      return;
    }

    startEegReader(source).catch((error) =>
      logger.ioError("EEG reader start failed", error),
    );

    let unlistenPackets: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;

    subscribeToEegPackets((packet) => {
      resetWatchdog();
      setPoorSignalLevel(packet.poorSignalLevel);
      if (packet.poorSignalLevel < POOR_SIGNAL_REJECTION_THRESHOLD) {
        setRawBandPowers(packet);
        setDisplayBandPowers(computeRelativeBandPowers(packet));
      }
    })
      .then((unlisten) => {
        unlistenPackets = unlisten;
      })
      .catch((error) =>
        logger.ioError("EEG packet subscription failed", error),
      );

    subscribeToHeadsetStatus((status: HeadsetConnectionStatus) => {
      setIsConnected(status === "connected");
      if (status === "disconnected") {
        setDisplayBandPowers(undefined);
        setRawBandPowers(undefined);
      }
    })
      .then((unlisten) => {
        unlistenStatus = unlisten;
      })
      .catch((error) =>
        logger.ioError("Headset status subscription failed", error),
      );

    return () => {
      unlistenPackets?.();
      unlistenStatus?.();
      clearWatchdog();
      stopReader();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, sourceType, esp32PortName]);

  return { displayBandPowers, rawBandPowers, isConnected, poorSignalLevel };
};
