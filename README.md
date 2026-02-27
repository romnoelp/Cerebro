# Cerebro

An undergraduate thesis project exploring EEG-based focus classification in academic settings. A desktop application that performs live EEG signal acquisition, real-time deep learning inference, and brain state monitoring. Built with Tauri v2, React 19, and TypeScript.

---

## Overview

Cerebro is the software component of a thesis investigating whether EEG signals can reliably classify student focus states during various academic tasks. It connects to a NeuroSky-style headset (512 Hz sampling rate), runs on-device deep learning models to infer focus state in real time, and exports annotated session data per subject.

The application currently simulates the EEG signal stream — the UI, session flow, model loading, and export pipeline are fully implemented and ready for real hardware integration.

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
│       │   ├── useSessionTimer.tsx    # Elapsed time + sample counter (512 Hz)
│       │   ├── useModelLoader.tsx     # File-picker model loading & validation
│       │   └── useCalibration.tsx     # Step-through calibration dialog state
│       └── components/
│           ├── StatCard.tsx           # Stat strip card (elapsed, samples, models)
│           ├── ModelManagementCard.tsx # Model load UI with status indicators
│           ├── SessionControlsCard.tsx # Start / Stop / Export buttons
│           ├── PatientNameDialog.tsx   # Patient name input dialog
│           └── CalibrationDialog.tsx   # Animated 4-step calibration flow
├── components/
│   ├── AppSidebar.tsx          # Animated sidebar with nav + user footer
│   ├── chart-line-interactive.tsx  # Live EEG chart + focus index indicator
│   ├── chart-area-interactive.tsx  # Historical area chart (Dashboard)
│   └── section-cards.tsx       # Dashboard metric cards
└── lib/
    └── file-contents.ts        # Screen registry and live/code view routing
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

3. Live Acquisition
   └─ EEG chart streams alpha (8–13 Hz) and theta (4–8 Hz) band power
   └─ Rolling 30-second window, ticks every 400ms
   └─ Focus Index computed as alpha/theta ratio over last 5 data points
       ├─ ratio ≥ 0.5 → FOCUSED  (matches notebook sigmoid decision boundary)
       └─ ratio < 0.5 → UNFOCUSED
   └─ Brain State bar and label update in real time
   └─ Session can be paused (Stop) and resumed (Start) without resetting

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

- **Animated sidebar** — collapsible, powered by Radix UI + Motion
- **Stars background** — adapts color to light/dark theme
- **Dark/light theme** — via `next-themes`
- **Animated dialogs** — patient name + calibration use `animate-ui` primitives
- **Stat strip** — live elapsed time, sample count, and model load status

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

- EEG signal is still **simulated** — real NeuroSky hardware integration is not yet implemented
- Dashboard metrics are **static** — no session history is persisted between app launches
- Model inference runs at the **UI layer only** — the `.pt` / `.pkl` files are loaded by path but not yet executed; the inference bridge (likely ONNX export + Rust-side runtime, or a Python sidecar) is pending

---
