import { useRecordingStore } from "@/adapters/useRecordingStore";

// Thin delegate — all recording state lives in the persistent useRecordingStore
// (Zustand) so recorder rows survive screen navigation without data loss.

export const useSessionRecorder = () => {
  const rowCount = useRecordingStore((store) => store.rowCount);
  const appendEegRecord = useRecordingStore((store) => store.appendEegRecord);
  const buildCsvString = useRecordingStore((store) => store.buildCsvString);
  const buildSessionSummary = useRecordingStore(
    (store) => store.buildSessionSummary,
  );
  const clearRecording = useRecordingStore((store) => store.clearRecording);

  return {
    rowCount,
    appendEegRecord,
    buildCsvString,
    buildSessionSummary,
    clearRecording,
  };
};
