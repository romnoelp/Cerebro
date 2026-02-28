export const formatElapsed = (secs: number) => {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const formatSamples = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

/** Builds a timestamped CSV filename for a session export. */
export function buildExportFilename(subjectName: string): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  return subjectName.trim()
    ? `${subjectName.trim().replace(/\s+/g, "_")}_${date}_${time}.csv`
    : `session_${date}_${time}.csv`;
}
