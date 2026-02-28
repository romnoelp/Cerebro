import { useEffect, useRef, useState } from "react";
import { calibrationSteps, stepDuration } from "../constants";

interface UseCalibrationConfig {
  active: boolean;
  isConnected: boolean;
  poorSignalLevel: number;
}

export const useCalibration = ({
  active,
  isConnected,
  poorSignalLevel,
}: UseCalibrationConfig) => {
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
      const t = setTimeout(() => {
        if (!isConnectedRef.current || poorSignalLevelRef.current >= 50) {
          setSignalFailed(true);
        } else {
          setCalibrationStep((i) => i + 1);
        }
      }, stepDuration);
      return () => clearTimeout(t);
    }

    if (calibrationStep < calibrationSteps.length - 1) {
      const t = setTimeout(
        () => setCalibrationStep((i) => i + 1),
        stepDuration,
      );
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setShowStartButton(true), stepDuration);
      return () => clearTimeout(t);
    }
  }, [active, calibrationStep, signalFailed]);

  const reset = () => {
    setCalibrationStep(0);
    setShowStartButton(false);
    setSignalFailed(false);
  };

  return { calibrationStep, showStartButton, signalFailed, reset };
};
