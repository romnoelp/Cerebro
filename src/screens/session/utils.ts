export const formatElapsed = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export const formatSamples = (count: number): string =>
  count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);

/** Builds a timestamped CSV filename for a session export. */
export const buildExportFilename = (subjectName: string): string => {
  const now = new Date();
  const datePart = now.toISOString().split("T")[0];
  const timePart = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  return subjectName.trim()
    ? `${subjectName.trim().replace(/\s+/g, "_")}_${datePart}_${timePart}.csv`
    : `session_${datePart}_${timePart}.csv`;
};
