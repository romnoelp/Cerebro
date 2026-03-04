import { create } from "zustand";

// Zustand state slice for the session scanning lifecycle.
// Lives outside the React component tree so navigation does not wipe an
// in-progress session.

interface HeadsetSessionState {
  isScanning: boolean;
  hasSessionStarted: boolean;
  subjectName: string;

  setIsScanning: (value: boolean) => void;
  setHasSessionStarted: (value: boolean) => void;
  setSubjectName: (value: string) => void;
  resetSessionIdentity: () => void;
}

export const useHeadsetStore = create<HeadsetSessionState>((set) => ({
  isScanning: false,
  hasSessionStarted: false,
  subjectName: "",

  setIsScanning: (value) => set({ isScanning: value }),
  setHasSessionStarted: (value) => set({ hasSessionStarted: value }),
  setSubjectName: (value) => set({ subjectName: value }),
  resetSessionIdentity: () =>
    set({ hasSessionStarted: false, subjectName: "" }),
}));
