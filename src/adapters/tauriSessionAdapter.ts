import { invoke } from "@tauri-apps/api/core";
import type {
  SessionSummary,
  SessionPersistencePort,
  SaveSessionRequest,
} from "@/domain";

// Concrete implementation of SessionPersistencePort backed by Tauri commands.
export const createTauriSessionRepository = (): SessionPersistencePort => ({
  saveSession: (request: SaveSessionRequest): Promise<void> =>
    invoke("save_session", { request }),

  loadSessions: (): Promise<SessionSummary[]> =>
    invoke<SessionSummary[]>("load_sessions"),
});
