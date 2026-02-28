# Cerebro

An undergraduate thesis project exploring EEG-based focus classification in academic settings. A desktop application that performs live EEG signal acquisition, real-time deep learning inference, and brain state monitoring. Built with Tauri v2, React 19, and TypeScript.

---
## Sample Pictures
<img width="1281" height="729" alt="image" src="https://github.com/user-attachments/assets/71b42548-53af-4eea-8a01-d4fd5dc357ec" />
<img width="1281" height="718" alt="image" src="https://github.com/user-attachments/assets/a172aa0a-5bb5-4756-ac2b-00cbbe4b7517" />

--
## Overview

Cerebro is the software component of a thesis investigating whether EEG signals can reliably classify student focus states during various academic tasks. It connects to a NeuroSky MindWave Mobile 2 headset via the ThinkGear Connector (TGC), streams all 8 TGAM band powers in real time through a Rust TCP bridge, runs on-device focus classification using a unified TCN+DDQN ONNX model, and exports annotated session data per subject.

The full pipeline is implemented end-to-end: headset connection, real-time ONNX inference, session recording, CSV export, and cross-session Dashboard persistence.

---

## Tech Stack

| Layer           | Technology                      |
| --------------- | ------------------------------- |
| Desktop runtime | Tauri v2 (Rust)                 |
| Frontend        | React 19 + TypeScript + Vite    |
| Styling         | Tailwind CSS v4                 |
| Charts          | Recharts                        |
| Animations      | Motion (Framer Motion v12)      |
| Notifications   | Sileo                           |
| UI primitives   | Radix UI, shadcn/ui             |
| File dialogs    | `@tauri-apps/plugin-dialog`     |
| EEG bridge      | ThinkGear Connector (TCP)       |
| ML inference    | ONNX Runtime (`ort` v2.0, Rust) |
| State mgmt      | Zustand                         |

---

## Headset Connection

Cerebro communicates with the NeuroSky MindWave Mobile 2 through the **ThinkGear Connector (TGC)** — a local TCP server NeuroSky provides that abstracts the Bluetooth COM port.

### How it works

```
MindWave Mobile 2  →  Bluetooth  →  ThinkGear Connector (localhost:13854)
                                           ↓  TCP / newline-delimited JSON
                                    Rust TGC bridge (networking/tgc_reader.rs)
                                           ↓  Tauri IPC event  (tgc-data)
                                    useTgcConnection hook
                                           ↓
                                    Live EEG chart (8 bands)
```

### Rust bridge (`src-tauri/src/commands/headset.rs`, `networking/tgc_reader.rs`)

Exposes these Tauri commands (registered in `lib.rs`):

| Command                | Effect                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| `start_tgc`            | Spawns a background thread that connects to TGC and reads data      |
| `stop_tgc`             | Sets the thread stop flag; thread exits within 500 ms               |
| `load_model_files`     | Loads ONNX model + scaler JSON, hot-swappable without restart       |
| `get_focus_prediction` | Runs one EEG packet through the full inference pipeline             |
| `save_session`         | Writes session CSV to disk and appends a summary to `sessions.json` |
| `load_sessions`        | Returns all saved `SessionSummary` records from `sessions.json`     |

The thread (`networking/tgc_reader.rs`):

1. Opens a TCP connection to `127.0.0.1:13854`, retrying every 2 s on failure.
2. Sends the authorization JSON (`appName` / `appKey`).
3. Reads newline-delimited JSON packets, filtering for packets that contain the `eegPower` field.
4. Emits a `tgc-data` Tauri event with the parsed `EegPayload` each time a complete packet arrives.
5. Emits `tgc-status` (`connected` / `disconnected`) on connection state changes.

### Signal quality gating

TGC includes a `poorSignalLevel` field in each packet (0 = clean contact, 200 = no contact). The `useTgcConnection` hook discards any packet where `poorSignalLevel ≥ 50`, preventing noisy artifacts from reaching the chart or the inference pipeline.

### EEG band powers

The TGAM chip inside the headset pre-computes 8 band powers at approximately 1 Hz:

| Band       | Frequency range | Key         |
| ---------- | --------------- | ----------- |
| Delta      | 0.5 – 2.75 Hz   | `delta`     |
| Theta      | 3.5 – 6.75 Hz   | `theta`     |
| Low Alpha  | 7.5 – 9.25 Hz   | `lowAlpha`  |
| High Alpha | 10 – 11.75 Hz   | `highAlpha` |
| Low Beta   | 13 – 16.75 Hz   | `lowBeta`   |
| High Beta  | 18 – 29.75 Hz   | `highBeta`  |
| Low Gamma  | 31 – 39.75 Hz   | `lowGamma`  |
| Mid Gamma  | 41 – 49.75 Hz   | `midGamma`  |

> **Note:** TGC refers to the last band as `highGamma`. It is remapped to `midGamma` in the Rust `EegPayload` struct to match the frontend chart key naming.

Raw band powers are absolute integer values. The hook normalizes them to **relative percentages** (each band ÷ sum of all bands × 100) before updating the chart, matching the preprocessing used in the TCN+DDQN training notebook.

### Setup (per session)

1. Power on the headset and pair it via Windows Bluetooth settings.
2. ThinkGear Connector launches automatically on Windows boot and starts the TCP server.
3. Launch Cerebro (`pnpm tauri dev`).
4. Navigate to the Session screen and click **Start** — the Rust bridge connects automatically.

---

## ML Models

Two model files must be loaded before a session can begin:

| File                   | Role                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `cerebro_unified.onnx` | Unified TCN+DDQN ONNX export — the full TCN feature extractor + DDQN policy head compiled into a single ONNX inference graph  |
| `scaler_params.json`   | Signal Scaler — StandardScaler mean/scale parameters (JSON) fitted on the thesis dataset, applied to raw EEG before inference |

Model files were trained as part of the thesis research. They are loaded at runtime via the file picker. The app validates filenames against the expected list and rejects unrecognized files.

Inference runs **natively in Rust** using [ONNX Runtime](https://onnxruntime.ai/) (`ort` crate with `download-binaries`). No Python interpreter or sidecar process is required. The Rust `ModelManager` in `src-tauri/src/models/ml_data.rs` handles:

1. Loading the ONNX session and parsing the scaler JSON on startup.
2. Extracting an 11-feature vector from each raw EEG packet (8 relative band powers + β/θ ratio + α/β ratio + temporal Δdelta).
3. Normalising with the loaded scaler parameters (sklearn `StandardScaler.transform` logic).
4. Running the ONNX session and returning a `FocusPrediction` (`label`: 0/1, `labelName`: "Focused"/"Unfocused").

---

## Application Structure

```
src/
├── screens/
│   ├── Layout.tsx              # Root layout: sidebar + content area + stars background
│   ├── Dashboard.tsx           # Brain activity overview & aggregate metrics (live from sessions.json)
│   ├── Session.tsx             # Live EEG acquisition & session management
│   └── session/
│       ├── constants.ts        # Model definitions (ONNX + scaler), calibration steps
│       ├── utils.ts            # formatElapsed, formatSamples, buildExportFilename helpers
│       ├── hooks/
│       │   ├── useSessionTimer.ts       # Elapsed time + sample counter
│       │   ├── useModelLoader.ts        # File-picker model loading & validation
│       │   ├── useSessionRecorder.ts    # In-memory row buffer + CSV serialisation + session summary
│       │   ├── useCalibration.ts        # Step-through calibration dialog state
│       │   └── useTgcConnection.ts      # TGC start/stop, tgc-data listener, normalization
│       └── components/
│           ├── StatCard.tsx             # Stat strip card (elapsed, samples, models)
│           ├── ModelManagementCard.tsx  # Model load UI with status indicators
│           ├── SessionControlsCard.tsx  # Start / Stop / Export buttons
│           ├── SubjectNameDialog.tsx    # Subject name input dialog
│           ├── CalibrationDialog.tsx    # Animated 4-step calibration flow
│           └── DisconnectDialog.tsx     # Mid-session headset-drop handler
├── components/
│   ├── AppSidebar.tsx              # Collapsible sidebar (icon mode) with nav + user footer
│   ├── chart-line-interactive.tsx  # Live 8-band EEG chart + focus index + band toggle pills
│   ├── chart-area-interactive.tsx  # Historical area chart (Dashboard)
│   └── section-cards.tsx           # Dashboard metric cards (reads from SessionStore)
├── types/
│   ├── ui.ts                   # Screen, AppFile (navigation & UI types)
│   ├── eeg.ts                  # TgcBandData, TgcStatus, FocusPrediction, SessionSummary
│   └── index.ts                # Barrel re-export
└── lib/
    ├── constants.ts            # Shared EASE animation curve
    ├── useSessionStore.ts      # Zustand store: SessionSummary[], loadSessions, addSession
    └── file-contents.ts        # Screen registry and live/code view routing

src-tauri/src/
├── lib.rs                      # App state setup + plugin/command registration
├── commands/
│   └── headset.rs              # load_model_files, start_tgc, stop_tgc,
│                               # get_focus_prediction, save_session, load_sessions
├── models/
│   ├── ml_data.rs              # ModelManager (ONNX inference, feature extraction, normalisation)
│   └── tgc_data.rs             # EegPayload struct (mirrors TgcBandData on the frontend)
└── networking/
    └── tgc_reader.rs           # TCP reader loop: connect → auth → parse → emit tgc-data events
```

---

## Session Flow

```
1. Load Models
   └─ Open file picker → select cerebro_unified.onnx and scaler_params.json
   └─ Both files must be loaded before the Start button activates

2. Start Session
   └─ Enter subject name
   └─ Calibration dialog (4 automated steps, ~1.4s each):
       ├─ "Participant seated comfortably..."
       ├─ "Checking signal integrity..."
       ├─ "Baseline calibration in progress..."
       └─ "System ready for acquisition" → Start button appears
   └─ On completion: Rust start_tgc command fires → TCP connection to TGC opens

3. Live Acquisition
   └─ Rust bridge receives JSON packets from TGC (~1 Hz)
   └─ Packets with poorSignalLevel ≥ 50 are discarded (poor electrode contact)
   └─ Valid packets are normalized to relative band power percentages
   └─ Frontend receives tgc-data events via Tauri IPC
   └─ All 8 TGAM band powers plotted on the live chart (toggle per band)
   └─ Rolling 30-second window; mock data runs when headset is not connected
   └─ Each valid packet is passed to get_focus_prediction (Rust ONNX inference)
       ├─ Returns FocusPrediction { label: 0/1, labelName: "Focused"/"Unfocused" }
       └─ If models are not yet loaded, label defaults to -1 / "N/A" — no data lost
   └─ Each packet + prediction is appended to the in-memory session buffer (useSessionRecorder)
   └─ Brain State bar and label update in real time
   └─ Session can be paused (Stop) and resumed (Start) without resetting
       └─ stop_tgc fires on pause; start_tgc fires on resume
   └─ Headset disconnection mid-session triggers DisconnectDialog
       └─ Offers "Save & End Session" with the samples collected so far

4. Export
   └─ Save dialog opens → generates filename: SubjectName_YYYY-MM-DD_HH-MM-SS.csv
   └─ useSessionRecorder.buildCsv() serialises all buffered rows to CSV
   └─ save_session Tauri command: writes CSV to disk, appends SessionSummary to sessions.json
   └─ useSessionStore.addSession() updates the Dashboard store in-memory immediately
   └─ On successful save: timer resets, chart clears, session buffer clears
```

---

## Dashboard

The Dashboard screen displays aggregate metrics across sessions:

| Card           | Metric                                          |
| -------------- | ----------------------------------------------- |
| Alpha Power    | Mean alpha band power across subjects           |
| Signal Quality | Acquisition impedance quality (%)               |
| Total Sessions | Number of recorded sessions across all subjects |
| Focus Index    | Mean attention score averaged across sessions   |

Metrics are computed from `SessionSummary` records persisted in `sessions.json` (stored in the Tauri app-data directory). On app mount, `useSessionStore.loadSessions()` calls the `load_sessions` Tauri command to hydrate the Zustand store. After each export, `addSession()` pushes the new summary in-memory so the Dashboard updates without a restart.

---

## UI Features

- **Animated sidebar** — collapsible to icon mode with tooltips, powered by Radix UI + Motion
- **Stars background** — adapts color to light/dark theme
- **Dark/light theme** — via `next-themes`
- **Animated dialogs** — subject name + calibration use `animate-ui` primitives
- **Stat strip** — live elapsed time, sample count, and model load status
- **8-band live chart** — per-band toggle pills, glassmorphic cards, muted oklch color palette
- **Brain State indicator** — real-time ONNX focus/unfocus prediction label with animated progress bar

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Install & Run

```bash
pnpm install
pnpm run tauri dev
```

### Build

```bash
pnpm run tauri build
```

---

## Known Limitations

- **Dashboard chart shows an empty state before the first export** — the area chart displays "Export a session to see band trends here." until at least one session has been saved

---
