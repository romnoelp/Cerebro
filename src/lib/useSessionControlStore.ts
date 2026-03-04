// Re-exported from the adapters layer for backward compatibility.
// New code should import useHeadsetStore from @/adapters/useHeadsetStore
// and useRecordingStore from @/adapters/useRecordingStore directly.
export { useHeadsetStore as useSessionControlStore } from "@/adapters/useHeadsetStore";
export { useRecordingStore } from "@/adapters/useRecordingStore";
export type {
  BuildSessionSummaryOptions as BuildSummaryOptions,
  EegRecordRow as CsvRow,
} from "@/adapters/useRecordingStore";
