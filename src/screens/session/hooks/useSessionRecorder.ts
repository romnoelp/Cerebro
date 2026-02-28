import { useRef, useState } from "react";
import { type TgcBandData, type FocusPrediction, type SessionSummary } from "@/types";

// One row per accepted EEG packet (~1 Hz).
interface CsvRow {
  timestamp: string;
  delta: number;
  theta: number;
  lowAlpha: number;
  highAlpha: number;
  lowBeta: number;
  highBeta: number;
  lowGamma: number;
  midGamma: number;
  attention: number;
  meditation: number;
  poorSignalLevel: number;
  focusLabel: number;   // 0 = Unfocused, 1 = Focused, -1 = model not loaded
  focusPrediction: string;
}

const CSV_HEADER =
  "timestamp,delta,theta,lowAlpha,highAlpha,lowBeta,highBeta,lowGamma,midGamma," +
  "attention,meditation,poorSignalLevel,focusLabel,focusPrediction";

const rowToLine = (row: CsvRow): string => {
  return [
    row.timestamp,
    row.delta,
    row.theta,
    row.lowAlpha,
    row.highAlpha,
    row.lowBeta,
    row.highBeta,
    row.lowGamma,
    row.midGamma,
    row.attention,
    row.meditation,
    row.poorSignalLevel,
    row.focusLabel,
    row.focusPrediction,
  ].join(",");
}

/**
 * Accumulates EEG + prediction rows in a ref (no re-renders per packet).
 * `rowCount` is the only stateful value — updated on record/clear so the UI
 * can show how many samples have been collected.
 */
export function useSessionRecorder() {
  const rowsRef = useRef<CsvRow[]>([]);
  const [rowCount, setRowCount] = useState(0);

  /**
   * Appends one row. Call this once per accepted `tgc-data` packet.
   * Pass `prediction` as undefined when the model is not yet loaded — the row
   * will be recorded with label -1 and labelName "N/A" so no data is lost.
   */
  const record = (raw: TgcBandData, prediction: FocusPrediction | undefined) => {
    rowsRef.current.push({
      timestamp: new Date().toISOString(),
      delta: raw.delta,
      theta: raw.theta,
      lowAlpha: raw.lowAlpha,
      highAlpha: raw.highAlpha,
      lowBeta: raw.lowBeta,
      highBeta: raw.highBeta,
      lowGamma: raw.lowGamma,
      midGamma: raw.midGamma,
      attention: raw.attention,
      meditation: raw.meditation,
      poorSignalLevel: raw.poorSignalLevel,
      focusLabel: prediction?.label ?? -1,
      focusPrediction: prediction?.labelName ?? "N/A",
    });
    setRowCount(rowsRef.current.length);
  }

  /** Serializes all accumulated rows to a CSV string ready for disk write. */
  const buildCsv = (): string => {
    return [CSV_HEADER, ...rowsRef.current.map(rowToLine)].join("\n");
  }

  /**
   * Builds a compact SessionSummary from the accumulated rows.
   * Call this just before export so the summary reflects the full session.
   */
  const buildSummary = (
    subjectName: string,
    durationSecs: number,
    csvPath: string,
  ): SessionSummary => {
    const rows = rowsRef.current;
    const count = rows.length || 1;
    const meanOf = (key: keyof CsvRow): number =>
      rows.reduce((sum, r) => sum + Number(r[key]), 0) / count;

    return {
      id: crypto.randomUUID(),
      subjectName,
      exportedAt: new Date().toISOString(),
      csvPath,
      sampleCount: rows.length,
      durationSecs,
      focusedCount: rows.filter((r) => r.focusLabel === 1).length,
      unfocusedCount: rows.filter((r) => r.focusLabel === 0).length,
      meanAlpha: (meanOf("lowAlpha") + meanOf("highAlpha")) / 2,
      meanTheta: meanOf("theta"),
      meanAttention: meanOf("attention"),
      meanMeditation: meanOf("meditation"),
      signalQualityPct:
        (rows.filter((r) => r.poorSignalLevel === 0).length / count) * 100,
    };
  };

  /** Resets the recorder — call after a successful export. */
  const clear = () => {
    rowsRef.current = [];
    setRowCount(0);
  }

  return { rowCount, record, buildCsv, buildSummary, clear };
}
