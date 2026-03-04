// One complete EEG measurement packet from the TGAM chip.
// Field names match the camelCase-serialized EegPacket from the Rust backend.
export type EegBandPowers = {
  // Eight frequency-band powers (raw µV² values) from the TGAM chip
  delta: number;
  theta: number;
  lowAlpha: number;
  highAlpha: number;
  lowBeta: number;
  highBeta: number;
  lowGamma: number;
  midGamma: number;
  // eSense computed metrics (0–100 scale)
  attention: number;
  meditation: number;
  // 0 = perfect signal, 200 = no electrode contact
  poorSignalLevel: number;
};

// Inference result from one TCN+DDQN pass over a single EEG packet.
// Mirrors the camelCase-serialized FocusReading from the Rust backend.
export type FocusReading = {
  label: number; // 0 = Unfocused, 1 = Focused, −1 = model not loaded
  labelName: string; // "Focused" | "Unfocused" | "N/A"
};

export type HeadsetConnectionStatus = "connected" | "disconnected";
