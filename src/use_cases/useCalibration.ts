import { useEffect, useRef, useState } from "react";

const CALIBRATION_STEP_LABELS = [
  "Participant seated comfortably...",
  "Checking signal integrity...",
  "Baseline calibration in progress...",
  "System ready for acquisition",
] as const;

const CALIBRATION_STEP_DURATION_MS = 1400;
const POOR_SIGNAL_REJECTION_THRESHOLD = 50;

interface CalibrationConfig {
  active: boolean;
  isConnected: boolean;
  poorSignalLevel: number;
}

interface CalibrationResult {
  calibrationStep: number;
  showStartButton: boolean;
  signalFailed: boolean;
  reset: () => void;
}

export const useCalibration = ({
  active,
  isConnected,
  poorSignalLevel,
}: CalibrationConfig): CalibrationResult => {
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [showStartButton, setShowStartButton] = useState(false);
  const [signalFailed, setSignalFailed] = useState(false);

  // Refs so the timeout callback reads the latest values without causing resets.
  const isConnectedRef = useRef(isConnected);
  const poorSignalLevelRef = useRef(poorSignalLevel);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    poorSignalLevelRef.current = poorSignalLevel;
  }, [poorSignalLevel]);

  useEffect(() => {
    if (!active || signalFailed) return;

    if (calibrationStep === 1) {
      // Signal integrity check — fail fast if headset is not clean at this step.
      const timeoutId = setTimeout(() => {
        const signalIsUnacceptable =
          !isConnectedRef.current ||
          poorSignalLevelRef.current >= POOR_SIGNAL_REJECTION_THRESHOLD;
        if (signalIsUnacceptable) {
          setSignalFailed(true);
        } else {
          setCalibrationStep((step) => step + 1);
        }
      }, CALIBRATION_STEP_DURATION_MS);
      return () => clearTimeout(timeoutId);
    }

    if (calibrationStep < CALIBRATION_STEP_LABELS.length - 1) {
      const timeoutId = setTimeout(
        () => setCalibrationStep((step) => step + 1),
        CALIBRATION_STEP_DURATION_MS,
      );
      return () => clearTimeout(timeoutId);
    } else {
      const timeoutId = setTimeout(
        () => setShowStartButton(true),
        CALIBRATION_STEP_DURATION_MS,
      );
      return () => clearTimeout(timeoutId);
    }
  }, [active, calibrationStep, signalFailed]);

  const reset = () => {
    setCalibrationStep(0);
    setShowStartButton(false);
    setSignalFailed(false);
  };

  return { calibrationStep, showStartButton, signalFailed, reset };
};

export { CALIBRATION_STEP_LABELS };
