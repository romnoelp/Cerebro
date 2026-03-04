import type { EegBandPowers, FocusReading } from "./eegReading";
import type { SessionSummary } from "./sessionSummary";

// Every external capability that the use-case layer depends on is described
// as an interface here. Concrete implementations live in adapters/ and are
// never imported directly by use cases.

export interface FocusClassifierPort {
  classify(packet: EegBandPowers): Promise<FocusReading>;
}

export interface SessionPersistencePort {
  saveSession(request: SaveSessionRequest): Promise<void>;
  loadSessions(): Promise<SessionSummary[]>;
}

// Bundles the three fields required to persist a session.
// Wrapped in a named type to satisfy the rule against 3+ bare arguments.
export interface SaveSessionRequest {
  csvPath: string;
  csvContent: string;
  summary: SessionSummary;
}
