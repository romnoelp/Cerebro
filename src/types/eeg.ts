// Re-exported from the domain layer for backward compatibility.
// Prefer importing directly from @/domain in new code.
export type {
  EegBandPowers as TgcBandData,
  FocusReading as FocusPrediction,
  HeadsetConnectionStatus as TgcStatus,
} from "@/domain";
export type { SessionSummary } from "@/domain";
