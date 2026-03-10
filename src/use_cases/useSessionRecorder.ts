import { useRecordingStore } from "@/adapters/useRecordingStore";

// Thin delegate — all recording state lives in the persistent useRecordingStore
// (Zustand) so recorder rows survive screen navigation without data loss.

export const useSessionRecorder = () => {
  const rowCount = useRecordingStore((store) => store.rowCount);
  const recentFocusLabels = useRecordingStore(
    (store) => store.recentFocusLabels,
  );
  const appendEegRecord = useRecordingStore((store) => store.appendEegRecord);
  const buildCsvString = useRecordingStore((store) => store.buildCsvString);
  const buildSessionSummary = useRecordingStore(
    (store) => store.buildSessionSummary,
  );
  const clearRecording = useRecordingStore((store) => store.clearRecording);

  // Majority vote over the rolling window: ≥ 3 out of 5 model labels = Focused.
  // Returns undefined when there are fewer than 5 labels (window not yet full).
  const rollingFocusVote: "focused" | "unfocused" | undefined =
    recentFocusLabels.length === 5
      ? recentFocusLabels.filter((l) => l === 1).length >= 3
        ? "focused"
        : "unfocused"
      : undefined;

  return {
    rowCount,
    appendEegRecord,
    buildCsvString,
    buildSessionSummary,
    clearRecording,
    rollingFocusVote,
  };
};
