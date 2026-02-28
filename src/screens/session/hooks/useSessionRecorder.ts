import { useRef, useState } from "react";
import { type TgcBandData, type FocusPrediction } from "@/types";

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

function rowToLine(r: CsvRow): string {
  return [
    r.timestamp,
    r.delta,
    r.theta,
    r.lowAlpha,
    r.highAlpha,
    r.lowBeta,
    r.highBeta,
    r.lowGamma,
    r.midGamma,
    r.attention,
    r.meditation,
    r.poorSignalLevel,
    r.focusLabel,
    r.focusPrediction,
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
  function record(raw: TgcBandData, prediction: FocusPrediction | undefined) {
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
  function buildCsv(): string {
    return [CSV_HEADER, ...rowsRef.current.map(rowToLine)].join("\n");
  }

  /** Resets the recorder — call after a successful export. */
  function clear() {
    rowsRef.current = [];
    setRowCount(0);
  }

  return { rowCount, record, buildCsv, clear };
}
