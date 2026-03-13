import { create } from "zustand";
import type { EegBandPowers, FocusReading, SessionSummary } from "@/domain";

// One row recorded per accepted EEG packet (~1 Hz).
export type EegRecordRow = {
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
  focusLabel: number; // 0 = Unfocused, 1 = Focused, −1 = model not loaded
  focusPrediction: string;
};

export interface BuildSessionSummaryOptions {
  subjectName: string;
  durationSecs: number;
  csvPath: string;
}

// Stored outside Zustand state so appending a row (~1 Hz) does not trigger a
// full store re-render. Only `rowCount` is kept in Zustand for the UI counter.
const accumulatedRows: EegRecordRow[] = [];

const CSV_HEADER =
  "timestamp,delta,theta,lowAlpha,highAlpha,lowBeta,highBeta,lowGamma,midGamma," +
  "attention,meditation,poorSignalLevel,focusLabel,focusPrediction";

const recordRowToCsvLine = (row: EegRecordRow): string =>
  [
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

interface RecordingStore {
  rowCount: number;
  /** Last 5 model focus labels (0 or 1 only; −1 excluded). Used for the
   *  rolling majority vote displayed on the live chart. */
  recentFocusLabels: number[];
  resetFocusWindow: () => void;

  /**
   * To append one row per accepted tgc-data packet. Pass `focusReading` as
   * undefined when the model is not loaded — the row is recorded with label
   * -1 and "N/A" so no packet is silently dropped.
   */
  appendEegRecord: (
    bandPowers: EegBandPowers,
    focusReading: FocusReading | undefined,
  ) => void;

  /** To serialize all accumulated rows to a CSV string ready for disk write. */
  buildCsvString: () => string;

  /** To build a compact SessionSummary from all accumulated rows. Call this
   * just before export so the summary reflects the complete session. */
  buildSessionSummary: (options: BuildSessionSummaryOptions) => SessionSummary;

  /** To reset the recorder after a successful export or session cancellation. */
  clearRecording: () => void;
}

const ROLLING_WINDOW = 5;

export const useRecordingStore = create<RecordingStore>((set) => ({
  rowCount: 0,
  recentFocusLabels: [],

  resetFocusWindow: () => {
    set({ recentFocusLabels: [] });
  },

  appendEegRecord: (bandPowers, focusReading) => {
    accumulatedRows.push({
      timestamp: new Date().toISOString(),
      delta: bandPowers.delta,
      theta: bandPowers.theta,
      lowAlpha: bandPowers.lowAlpha,
      highAlpha: bandPowers.highAlpha,
      lowBeta: bandPowers.lowBeta,
      highBeta: bandPowers.highBeta,
      lowGamma: bandPowers.lowGamma,
      midGamma: bandPowers.midGamma,
      attention: bandPowers.attention,
      meditation: bandPowers.meditation,
      poorSignalLevel: bandPowers.poorSignalLevel,
      focusLabel: focusReading?.label ?? -1,
      focusPrediction: focusReading?.labelName ?? "N/A",
    });
    set((state) => {
      // Only keep valid model labels (0 or 1) in the rolling window — skip −1
      // (model not loaded) so the heuristic isn't diluted by unclassified packets.
      const label = focusReading?.label;
      const next =
        label === 0 || label === 1
          ? [...state.recentFocusLabels, label].slice(-ROLLING_WINDOW)
          : state.recentFocusLabels;
      return { rowCount: accumulatedRows.length, recentFocusLabels: next };
    });
  },

  buildCsvString: () =>
    [CSV_HEADER, ...accumulatedRows.map(recordRowToCsvLine)].join("\n"),

  buildSessionSummary: ({ subjectName, durationSecs, csvPath }) => {
    const rowTotal = accumulatedRows.length || 1;
    const meanOf = (key: keyof EegRecordRow): number =>
      accumulatedRows.reduce((sum, row) => sum + Number(row[key]), 0) /
      rowTotal;

    return {
      id: crypto.randomUUID(),
      subjectName,
      exportedAt: new Date().toISOString(),
      csvPath,
      sampleCount: accumulatedRows.length,
      durationSecs,
      focusedCount: accumulatedRows.filter((row) => row.focusLabel === 1)
        .length,
      unfocusedCount: accumulatedRows.filter((row) => row.focusLabel === 0)
        .length,
      meanAlpha: (meanOf("lowAlpha") + meanOf("highAlpha")) / 2,
      meanTheta: meanOf("theta"),
      meanAttention: meanOf("attention"),
      meanMeditation: meanOf("meditation"),
      signalQualityPct:
        (accumulatedRows.filter((row) => row.poorSignalLevel === 0).length /
          rowTotal) *
        100,
    };
  },

  clearRecording: () => {
    accumulatedRows.length = 0;
    set({ rowCount: 0, recentFocusLabels: [] });
  },
}));
