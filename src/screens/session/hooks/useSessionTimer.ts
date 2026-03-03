import { useEffect, useState } from "react";

export const useSessionTimer = (isScanning: boolean) => {
  const [elapsed, setElapsed] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);

  // Advances elapsed time and sample count at ~512 Hz (NeuroSky's nominal sample rate).
  useEffect(() => {
    if (!isScanning) return;
    const intervalId = setInterval(() => {
      setElapsed((previous) => previous + 1);
      setSampleCount((previous) => previous + 512);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isScanning]);

  const reset = () => {
    setElapsed(0);
    setSampleCount(0);
  };

  return { elapsed, sampleCount, reset };
};
