// Compact summary persisted to sessions.json after each export.
// Contains pre-computed aggregates so the dashboard never re-reads CSV files.
export type SessionSummary = {
  id: string;
  subjectName: string;
  exportedAt: string; // ISO 8601
  csvPath: string;
  sampleCount: number;
  durationSecs: number;
  focusedCount: number;
  unfocusedCount: number;
  meanAlpha: number;
  meanTheta: number;
  meanAttention: number;
  meanMeditation: number;
  signalQualityPct: number; // % of rows where poorSignalLevel === 0
};
