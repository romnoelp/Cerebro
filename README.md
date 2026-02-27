# Cerebro

An undergraduate thesis project exploring EEG-based focus classification in academic settings. A desktop application that performs live EEG signal acquisition, real-time deep learning inference, and brain state monitoring. Built with Tauri v2, React 19, and TypeScript.

---

## Overview

Cerebro is the software component of a thesis investigating whether EEG signals can reliably classify student focus states during various academic tasks. It connects to a NeuroSky MindWave Mobile 2 headset via the ThinkGear Connector (TGC), streams all 8 TGAM band powers in real time through a Rust TCP bridge, and exports annotated session data per subject.

The headset connection pipeline is fully implemented. The UI, session flow, model loading, and export pipeline are complete and ready. On-device model inference (TCN+DDQN) is the remaining integration step.

---

## Tech Stack

| Layer           | Technology                   |
| --------------- | ---------------------------- |
| Desktop runtime | Tauri v2 (Rust)              |
| Frontend        | React 19 + TypeScript + Vite |
| Styling         | Tailwind CSS v4              |
| Charts          | Recharts                     |
| Animations      | Motion (Framer Motion v12)   |
| Notifications   | Sileo                        |
| UI primitives   | Radix UI, shadcn/ui          |
| File dialogs    | `@tauri-apps/plugin-dialog`  |
| EEG bridge      | ThinkGear Connector (TCP)    |

---

## Headset Connection

Cerebro communicates with the NeuroSky MindWave Mobile 2 through the **ThinkGear Connector (TGC)** — a local TCP server NeuroSky provides that abstracts the Bluetooth COM port.

### How it works

```
MindWave Mobile 2  →  Bluetooth  →  ThinkGear Connector (localhost:13854)
                                           ↓  TCP / newline-delimited JSON
                                    Rust TGC bridge (lib.rs)
                                           ↓  Tauri IPC event  (tgc-data)
                                    useTgcConnection hook
                                           ↓
                                    Live EEG chart (8 bands)
```

### Rust bridge (`src-tauri/src/lib.rs`)

Exposes two Tauri commands:

| Command     | Effect                                                         |
| ----------- | -------------------------------------------------------------- |
| `start_tgc` | Spawns a background thread that connects to TGC and reads data |
| `stop_tgc`  | Sets the thread stop flag; thread exits within 500 ms          |

The thread:

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
2. Launch `ThinkGear Connector.exe` — it auto-detects the COM port and starts the TCP server.
3. Launch Cerebro (`pnpm tauri dev`).
4. Navigate to the Session screen and click **Start** — the Rust bridge connects automatically.

---

## ML Models

Three model files must be loaded before a session can begin:

| File                      | Role                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `ddqn_best_checkpoint.pt` | DDQN Policy Model — Deep Double Q-Network trained to classify focus/unfocus states from EEG features   |
| `tcn_best_checkpoint.pt`  | TCN Feature Extractor — Temporal Convolutional Network that encodes raw EEG band power time series     |
| `scaler.pkl`              | Signal Scaler — preprocessing scaler fitted on the thesis dataset, applied to raw EEG before inference |

Model files were trained as part of the thesis research and are stored in the `models/` directory. They are loaded at runtime via the file picker. The app validates filenames against the expected list and rejects unrecognized files.

---

## Application Structure

```
src/
├── screens/
│   ├── Layout.tsx              # Root layout: sidebar + content area + stars background
│   ├── Dashboard.tsx           # Brain activity overview & aggregate metrics
│   ├── Session.tsx             # Live EEG acquisition & session management
│   └── session/
│       ├── constants.ts        # Model definitions, calibration steps, animation config
│       ├── utils.ts            # formatElapsed, formatSamples helpers
│       ├── hooks/
│       │   ├── useSessionTimer.tsx      # Elapsed time + sample counter (512 Hz)
│       │   ├── useModelLoader.tsx       # File-picker model loading & validation
│       │   ├── useCalibration.tsx       # Step-through calibration dialog state
│       │   └── useTgcConnection.ts      # TGC start/stop, tgc-data listener, normalization
│       └── components/
│           ├── StatCard.tsx             # Stat strip card (elapsed, samples, models)
│           ├── ModelManagementCard.tsx  # Model load UI with status indicators
│           ├── SessionControlsCard.tsx  # Start / Stop / Export buttons
│           ├── SubjectNameDialog.tsx    # Subject name input dialog
│           └── CalibrationDialog.tsx    # Animated 4-step calibration flow
├── components/
│   ├── AppSidebar.tsx              # Collapsible sidebar (icon mode) with nav + user footer
│   ├── chart-line-interactive.tsx  # Live 8-band EEG chart + focus index + band toggle pills
│   ├── chart-area-interactive.tsx  # Historical area chart (Dashboard)
│   └── section-cards.tsx           # Dashboard metric cards
├── types/
│   └── index.ts                # TgcBandData, TgcStatus, and shared types
└── lib/
    └── file-contents.ts        # Screen registry and live/code view routing

src-tauri/src/
└── lib.rs                      # Rust TGC bridge: start_tgc / stop_tgc Tauri commands
```

---

## Session Flow

```
1. Load Models
   └─ Open file picker → select ddqn_best_checkpoint.pt / tcn_best_checkpoint.pt / scaler.pkl
   └─ All 3 must be loaded before the Start button activates

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
   └─ Focus Index computed as (lowBeta + highBeta) / 2 ÷ theta over last 5 points
       ├─ ratio ≥ 0.5 → FOCUSED  (mirrors notebook feature engineering)
       └─ ratio < 0.5 → UNFOCUSED
   └─ Brain State bar and label update in real time
   └─ Session can be paused (Stop) and resumed (Start) without resetting
       └─ stop_tgc fires on pause; start_tgc fires on resume

4. Export
   └─ Save dialog opens → generates filename: SubjectName_YYYY-MM-DD_HH-MM-SS.csv
   └─ On successful save: timer resets, chart clears, session state resets
```

---

## Dashboard

The Dashboard screen displays aggregate metrics across sessions:

| Card           | Metric                                          |
| -------------- | ----------------------------------------------- |
| Alpha Power    | Mean alpha band power (μV²) across subjects     |
| Signal Quality | Acquisition impedance quality (%)               |
| Total Sessions | Number of recorded sessions across all subjects |
| Focus Index    | Alpha/Theta ratio averaged across sessions      |

> **Note:** These values are currently hardcoded placeholders. Persistence (reading from saved session records on export) is planned as a future enhancement once real EEG hardware is integrated.

---

## UI Features

- **Animated sidebar** — collapsible to icon mode with tooltips, powered by Radix UI + Motion
- **Stars background** — adapts color to light/dark theme
- **Dark/light theme** — via `next-themes`
- **Animated dialogs** — subject name + calibration use `animate-ui` primitives
- **Stat strip** — live elapsed time, sample count, and model load status
- **8-band live chart** — per-band toggle pills, glassmorphic cards, muted oklch color palette
- **Brain State indicator** — real-time focus ratio with animated progress bar

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

- **Data recording not yet wired** — the Export button opens the save dialog but writes no data; the session buffer and CSV serialization are pending
- **Dashboard metrics are static** — no session history is persisted between app launches
- **Model inference not yet running** — `.pt` / `.pkl` files are loaded by path but not yet executed; the inference bridge (Python sidecar via `torch` + `pickle`, registered as a Tauri `externalBin`) is pending
- **TGC must be launched manually** — no auto-start; ThinkGear Connector must be running before clicking Start

---
