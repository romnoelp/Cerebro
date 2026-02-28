// Mirrors EegPayload in src-tauri/src/lib.rs.
// Field names match the `key` values in the BANDS array in
// chart-line-interactive.tsx so data can be spread directly into DataPoint.
export type TgcBandData = {
  // 8 ThinkGear frequency band powers (raw μV² values from TGAM chip)
  delta: number;
  theta: number;
  lowAlpha: number;
  highAlpha: number;
  lowBeta: number;
  highBeta: number;
  lowGamma: number;
  midGamma: number;
  // eSense computed metrics
  attention: number;
  meditation: number;
  // 0 = perfect signal, 200 = no electrode contact
  poorSignalLevel: number;
};

export type TgcStatus = "connected" | "disconnected";

// Mirrors FocusPrediction in src-tauri/src/models/ml_data.rs.
export type FocusPrediction = {
  label: number;       // 0 = Unfocused, 1 = Focused, -1 = model not loaded
  labelName: string;   // "Focused" | "Unfocused" | "N/A"
};

// Compact summary persisted to sessions.json after each export.
// Contains pre-computed aggregates so the Dashboard never re-parses CSVs.
export type SessionSummary = {
  id: string;
  subjectName: string;
  exportedAt: string;         // ISO 8601
  csvPath: string;
  sampleCount: number;
  durationSecs: number;
  focusedCount: number;
  unfocusedCount: number;
  meanAlpha: number;
  meanTheta: number;
  meanAttention: number;
  meanMeditation: number;
  signalQualityPct: number;   // % of rows where poorSignalLevel === 0
};
