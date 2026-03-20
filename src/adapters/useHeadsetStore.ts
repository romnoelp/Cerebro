import { create } from "zustand";
import type { SessionMode } from "@/domain";

const DEFAULT_ATTENTION_THRESHOLD = 50;
const MIN_ATTENTION_THRESHOLD = 40;
const MAX_ATTENTION_THRESHOLD = 90;

const clampAttentionThreshold = (value: number): number =>
  Math.min(MAX_ATTENTION_THRESHOLD, Math.max(MIN_ATTENTION_THRESHOLD, value));

// Zustand state slice for the session scanning lifecycle.
// Lives outside the React component tree so navigation does not wipe an
// in-progress session.

interface HeadsetSessionState {
  isScanning: boolean;
  hasSessionStarted: boolean;
  subjectName: string;
  sessionMode: SessionMode;
  attentionThreshold: number;

  setIsScanning: (value: boolean) => void;
  setHasSessionStarted: (value: boolean) => void;
  setSubjectName: (value: string) => void;
  setSessionMode: (value: SessionMode) => void;
  setAttentionThreshold: (value: number) => void;
  resetSessionIdentity: () => void;
}

export const useHeadsetStore = create<HeadsetSessionState>((set) => ({
  isScanning: false,
  hasSessionStarted: false,
  subjectName: "",
  sessionMode: "live",
  attentionThreshold: DEFAULT_ATTENTION_THRESHOLD,

  setIsScanning: (value) => set({ isScanning: value }),
  setHasSessionStarted: (value) => set({ hasSessionStarted: value }),
  setSubjectName: (value) => set({ subjectName: value }),
  setSessionMode: (value) =>
    set((state) =>
      state.hasSessionStarted ? state : { ...state, sessionMode: value },
    ),
  setAttentionThreshold: (value) =>
    set((state) =>
      state.hasSessionStarted
        ? state
        : { ...state, attentionThreshold: clampAttentionThreshold(value) },
    ),
  resetSessionIdentity: () =>
    set({
      hasSessionStarted: false,
      subjectName: "",
      sessionMode: "live",
      attentionThreshold: DEFAULT_ATTENTION_THRESHOLD,
    }),
}));
