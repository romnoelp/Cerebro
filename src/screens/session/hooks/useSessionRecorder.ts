import { useRef, useState } from "react";
import {
  type TgcBandData,
  type FocusPrediction,
  type SessionSummary,
} from "@/types";

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
  focusLabel: number; // 0 = Unfocused, 1 = Focused, -1 = model not loaded
  focusPrediction: string;
}

export interface BuildSummaryOptions {
  subjectName: string;
  durationSecs: number;
  csvPath: string;
}

const csvHeader =
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
};

/**
 * To accumulate EEG + prediction rows in a ref so data collection causes no
 * re-renders per packet. `rowCount` is the only stateful value — it updates
 * on each record/clear so the UI knows how many samples have been collected.
 */
export function useSessionRecorder() {
  const accumulatedRowsRef = useRef<CsvRow[]>([]);
  const [rowCount, setRowCount] = useState(0);

  /**
   * To append one row per accepted `tgc-data` packet. Pass `prediction` as
   * undefined when the model is not yet loaded — the row is recorded with
   * label -1 and labelName "N/A" so no packet is silently dropped.
   */
  const record = (
    raw: TgcBandData,
    prediction: FocusPrediction | undefined,
  ) => {
    accumulatedRowsRef.current.push({
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
    setRowCount(accumulatedRowsRef.current.length);
  };

  /** To serialize all accumulated rows to a CSV string ready for disk write. */
  const buildCsv = (): string => {
    return [csvHeader, ...accumulatedRowsRef.current.map(rowToLine)].join("\n");
  };

  /**
   * To build a compact SessionSummary from all accumulated rows. Call this
   * just before export so the summary reflects the complete session.
   */
  const buildSummary = (options: BuildSummaryOptions): SessionSummary => {
    const { subjectName, durationSecs, csvPath } = options;
    const rows = accumulatedRowsRef.current;
    const rowTotal = rows.length || 1;
    const meanOf = (key: keyof CsvRow): number =>
      rows.reduce((sum, row) => sum + Number(row[key]), 0) / rowTotal;

    return {
      id: crypto.randomUUID(),
      subjectName,
      exportedAt: new Date().toISOString(),
      csvPath,
      sampleCount: rows.length,
      durationSecs,
      focusedCount: rows.filter((row) => row.focusLabel === 1).length,
      unfocusedCount: rows.filter((row) => row.focusLabel === 0).length,
      meanAlpha: (meanOf("lowAlpha") + meanOf("highAlpha")) / 2,
      meanTheta: meanOf("theta"),
      meanAttention: meanOf("attention"),
      meanMeditation: meanOf("meditation"),
      signalQualityPct:
        (rows.filter((row) => row.poorSignalLevel === 0).length / rowTotal) *
        100,
    };
  };

  /** To reset the recorder after a successful export. */
  const clear = () => {
    accumulatedRowsRef.current = [];
    setRowCount(0);
  };

  return { rowCount, record, buildCsv, buildSummary, clear };
}
