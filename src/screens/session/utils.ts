export const formatElapsed = (secs: number) => {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const formatSamples = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
