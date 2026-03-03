/**
 * To provide a consistent, searchable, prefixed logging surface for all
 * system events. Every call emits a tag that describes the event domain,
 * making it easy to filter logs by category in the browser console.
 *
 * Tags:
 *   [System] – lifecycle, startup, teardown
 *   [IO]     – network, serial port, file operations
 *   [Event]  – Tauri event emissions and listeners
 *   [Logic]  – inference, calibration, state transitions
 */
export const logger = {
  system: (message: string): void => console.log(`[System] ${message}`),

  io: (message: string): void => console.log(`[IO] ${message}`),

  event: (message: string): void => console.log(`[Event] ${message}`),

  logic: (message: string): void => console.log(`[Logic] ${message}`),

  /** To surface unexpected errors with the originating domain tag. */
  ioError: (message: string, cause: unknown): void =>
    console.error(`[IO] ${message}:`, cause),

  systemError: (message: string, cause: unknown): void =>
    console.error(`[System] ${message}:`, cause),
};
