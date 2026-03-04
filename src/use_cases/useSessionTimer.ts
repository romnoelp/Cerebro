import { useEffect, useState } from "react";

// NeuroSky's nominal sample rate for the TGAM chip.
const NEUROSKY_NOMINAL_SAMPLE_RATE_HZ = 512;

interface SessionTimerResult {
  elapsedSeconds: number;
  estimatedSampleCount: number;
  reset: () => void;
}

export const useSessionTimer = (isScanning: boolean): SessionTimerResult => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedSampleCount, setEstimatedSampleCount] = useState(0);

  useEffect(() => {
    if (!isScanning) return;
    const intervalId = setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
      setEstimatedSampleCount(
        (previous) => previous + NEUROSKY_NOMINAL_SAMPLE_RATE_HZ,
      );
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isScanning]);

  const reset = () => {
    setElapsedSeconds(0);
    setEstimatedSampleCount(0);
  };

  return { elapsedSeconds, estimatedSampleCount, reset };
};
