import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { type SessionSummary } from "@/types";

interface SessionStore {
  sessions: SessionSummary[];
  /** To hydrate the store from sessions.json on app mount. Call once. */
  loadSessions: () => Promise<void>;
  /** To push a new summary into the store immediately after a successful export. */
  addSession: (summary: SessionSummary) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: [],

  loadSessions: async () => {
    const persistedSessions = await invoke<SessionSummary[]>("load_sessions");
    set({ sessions: persistedSessions });
  },

  addSession: (summary) =>
    set((store) => ({ sessions: [...store.sessions, summary] })),
}));
