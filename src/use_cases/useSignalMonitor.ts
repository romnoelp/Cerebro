import { useEffect, useRef } from "react";
import { sileo } from "sileo";

// 0 = perfect signal, 200 = no electrode contact (matches TGAM spec).
const POOR_SIGNAL_THRESHOLD = 50;

// A tier change must persist for this long before a toast is fired, so that
// brief transient fluctuations (a single bad packet) don't spam the user.
// The MindWave emits ~1 packet/sec, so 1 500 ms ≈ roughly one missed packet.
const DEBOUNCE_MS = 1500;

type SignalTier =
  | "good" // poorSignalLevel < 50
  | "poor" // 50 ≤ poorSignalLevel < 200
  | "noHeadset" // poorSignalLevel ≥ 200 (ESP32 alive, headset not sensed)
  | "noEsp32"; // isConnected === false (serial port closed / device gone)

const getSignalTier = (
  isConnected: boolean,
  poorSignalLevel: number,
): SignalTier => {
  if (!isConnected) return "noEsp32";
  if (poorSignalLevel >= 200) return "noHeadset";
  if (poorSignalLevel >= POOR_SIGNAL_THRESHOLD) return "poor";
  return "good";
};

interface SignalMonitorConfig {
  /** Only emit notifications while active (e.g. isScanning). */
  active: boolean;
  isConnected: boolean;
  poorSignalLevel: number;
}

/**
 * Watches signal quality during an active session and fires toast
 * notifications whenever the signal tier changes. A tier change must persist
 * for DEBOUNCE_MS before a toast fires, suppressing single-packet glitches.
 *
 * Uses a timeout-based debounce rather than a packet-count approach because
 * React's useEffect only runs when a dependency *changes* — if poorSignalLevel
 * jumps to 200 and stays there the effect fires exactly once, making packet
 * counting unreliable.
 *
 * The "noEsp32" tier (physical disconnect) is intentionally silent here
 * because DisconnectDialog already handles that case with a modal.
 */
export const useSignalMonitor = ({
  active,
  isConnected,
  poorSignalLevel,
}: SignalMonitorConfig): void => {
  // The last tier that triggered a notification (null = not yet initialised).
  const committedTierRef = useRef<SignalTier | null>(null);
  // The tier that the in-flight debounce timer is waiting to commit.
  const pendingTierRef = useRef<SignalTier | null>(null);
  // The active debounce timer handle.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!active) {
      // Reset all state when monitoring is inactive so the next activation
      // starts clean without carrying over stale refs or pending timers.
      clearTimer();
      committedTierRef.current = null;
      pendingTierRef.current = null;
      return;
    }

    const tier = getSignalTier(isConnected, poorSignalLevel);

    if (committedTierRef.current === null) {
      // First evaluation after activation — seed silently without notifying.
      committedTierRef.current = tier;
      return;
    }

    if (tier === committedTierRef.current) {
      // Back to the committed tier — cancel any in-flight debounce.
      clearTimer();
      pendingTierRef.current = null;
      return;
    }

    if (tier === pendingTierRef.current) {
      // Already debouncing toward this tier — let the timer run.
      return;
    }

    // A genuinely new tier has appeared — (re)start the debounce timer.
    clearTimer();
    pendingTierRef.current = tier;
    const prevTier = committedTierRef.current;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      pendingTierRef.current = null;
      committedTierRef.current = tier;

      switch (tier) {
        case "noEsp32":
          // Full disconnect — DisconnectDialog shows a modal; no extra toast.
          break;

        case "noHeadset":
          sileo.warning({
            title: "Headset not detected",
            description:
              "No electrode contact registered. Make sure the headset is correctly worn and the forehead sensor is touching skin.",
          });
          break;

        case "poor":
          sileo.warning({
            title: "Poor signal quality",
            description:
              "Signal quality has dropped — EEG packets are being rejected. Adjust the headband so the sensor sits snugly on your forehead.",
          });
          break;

        case "good":
          // Only celebrate a recovery, not the initial good state on startup.
          if (prevTier !== null && prevTier !== "good") {
            sileo.success({
              title: "Signal restored",
              description:
                "Signal quality is good again. EEG recording is resuming.",
            });
          }
          break;
      }
    }, DEBOUNCE_MS);

    // Cancel pending timer if deps change before it fires (e.g. signal
    // fluctuates again mid-debounce).
    return clearTimer;
  }, [active, isConnected, poorSignalLevel]);
};
