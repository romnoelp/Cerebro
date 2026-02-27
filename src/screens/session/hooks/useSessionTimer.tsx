import { useEffect, useState } from "react";

export const useSessionTimer = (isScanning: boolean) => {
  const [elapsed, setElapsed] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);

  // Elapsed timer
  useEffect(() => {
    if (!isScanning) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isScanning]);

  // Simulated sample counter (~512 Hz NeuroSky rate, shown as ~512 samples/s)
  useEffect(() => {
    if (!isScanning) return;
    const id = setInterval(() => setSampleCount((s) => s + 512), 1000);
    return () => clearInterval(id);
  }, [isScanning]);

  const reset = () => {
    setElapsed(0);
    setSampleCount(0);
  };

  return { elapsed, sampleCount, reset };
};
