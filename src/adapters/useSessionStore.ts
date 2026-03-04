import { create } from "zustand";
import type { SessionSummary } from "@/domain";
import { createTauriSessionRepository } from "./tauriSessionAdapter";

interface SessionHistoryStore {
  sessions: SessionSummary[];
  /** To hydrate the store from sessions.json on app mount. Call once. */
  loadSessions: () => Promise<void>;
  /** To push a new summary into the store immediately after a successful export. */
  addSession: (summary: SessionSummary) => void;
}

const sessionRepository = createTauriSessionRepository();

export const useSessionStore = create<SessionHistoryStore>((set) => ({
  sessions: [],

  loadSessions: async () => {
    const persistedSessions = await sessionRepository.loadSessions();
    set({ sessions: persistedSessions });
  },

  addSession: (summary) =>
    set((store) => ({ sessions: [...store.sessions, summary] })),
}));
