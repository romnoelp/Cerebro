import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { type SessionSummary } from "@/types";

interface SessionStore {
  sessions: SessionSummary[];
  /** One-time hydration from sessions.json — call on app mount. */
  loadSessions: () => Promise<void>;
  /** Push a new summary into the store immediately after export. */
  addSession: (summary: SessionSummary) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: [],

  loadSessions: async () => {
    const sessions = await invoke<SessionSummary[]>("load_sessions");
    set({ sessions });
  },

  addSession: (summary) =>
    set((state) => ({ sessions: [...state.sessions, summary] })),
}));
