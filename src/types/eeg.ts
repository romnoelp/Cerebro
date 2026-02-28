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
