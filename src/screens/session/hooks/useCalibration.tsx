import { useEffect, useState } from "react";
import { calibrationSteps, stepDuration } from "../constants";

export const useCalibration = (showCalibrationDialog: boolean) => {
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [showStartButton, setShowStartButton] = useState(false);

  useEffect(() => {
    if (!showCalibrationDialog) return;

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
  }, [showCalibrationDialog, calibrationStep]);

  const reset = () => {
    setCalibrationStep(0);
    setShowStartButton(false);
  };

  return { calibrationStep, showStartButton, reset };
};
