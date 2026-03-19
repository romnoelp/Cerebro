# Cerebro

An undergraduate thesis project exploring EEG-based focus classification in academic settings. Cerebro is a desktop app for live EEG acquisition, on-device deep-learning inference, and session analytics, built with Tauri v2, React 19, and TypeScript.

---

## Sample Pictures

<img width="1281" height="729" alt="image" src="https://github.com/user-attachments/assets/71b42548-53af-4eea-8a01-d4fd5dc357ec" />
<img width="1281" height="718" alt="image" src="https://github.com/user-attachments/assets/a172aa0a-5bb5-4756-ac2b-00cbbe4b7517" />

---

## Overview

Cerebro investigates whether EEG signals can classify focus states during academic tasks. It supports live EEG streaming, model inference, session recording, CSV export, and dashboard persistence.

Current runtime is ESP32 serial only:

- **MindWave Mobile 2 -> ESP32 (Bluetooth bridge) -> USB serial -> Tauri app**

---

## Tech Stack

| Layer           | Technology                      |
| --------------- | ------------------------------- |
| Desktop runtime | Tauri v2 (Rust)                 |
| Frontend        | React 19 + TypeScript + Vite    |
| Styling         | Tailwind CSS v4                 |
| Charts          | Recharts                        |
| Animations      | Motion                          |
| Notifications   | Sileo                           |
| UI primitives   | Radix UI, shadcn/ui, animate-ui |
| File dialogs    | `@tauri-apps/plugin-dialog`     |
| EEG I/O         | ESP32 serial (`serialport`)     |
| ML inference    | ONNX Runtime (`ort`, Rust)      |
| State mgmt      | Zustand                         |

---

## EEG Input Pipeline

### Active Path

```
MindWave Mobile 2 -> Bluetooth -> ESP32 firmware -> USB serial -> esp32_reader.rs

Tauri events (eeg-data, eeg-status)
-> useEegListener
-> live chart + recorder + inference
```

### Tauri commands (`src-tauri/src/infrastructure/tauri_commands.rs`)

| Command                | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `list_serial_ports`    | Enumerate available COM ports for ESP32 selection                |
| `start_esp32`          | Start ESP32 serial reader on selected port                       |
| `stop_esp32`           | Stop ESP32 reader                                                |
| `load_model_files`     | Load ONNX model + scaler JSON                                    |
| `get_focus_prediction` | Run one EEG packet through the full inference pipeline           |
| `get_mock_prediction`  | Developer-only mock inference path (not used by current UI flow) |
| `save_session`         | Write CSV to disk and append summary to `sessions.json`          |
| `load_sessions`        | Load persisted session summaries                                 |

### Signal quality gating

`useEegListener` rejects packets with `poorSignalLevel >= 50` before they reach display/inference/recording pipelines. It also applies a watchdog timeout so a silent source can still surface as disconnected quality state.

### EEG band powers

The app tracks 8 TGAM band powers:

| Band       | Frequency range | Key         |
| ---------- | --------------- | ----------- |
| Delta      | 0.5 - 2.75 Hz   | `delta`     |
| Theta      | 3.5 - 6.75 Hz   | `theta`     |
| Low Alpha  | 7.5 - 9.25 Hz   | `lowAlpha`  |
| High Alpha | 10 - 11.75 Hz   | `highAlpha` |
| Low Beta   | 13 - 16.75 Hz   | `lowBeta`   |
| High Beta  | 18 - 29.75 Hz   | `highBeta`  |
| Low Gamma  | 31 - 39.75 Hz   | `lowGamma`  |
| Mid Gamma  | 41 - 49.75 Hz   | `midGamma`  |

Raw band powers are stored for CSV/inference, while chart display uses relative percentages (each band divided by total power) for stable visualization.

---

## ML Models

Two files must be staged before scanning can start:

| File                   | Role                                                       |
| ---------------------- | ---------------------------------------------------------- |
| `cerebro_unified.onnx` | Unified TCN+DDQN ONNX graph                                |
| `scaler_params.json`   | StandardScaler mean/scale parameters used in preprocessing |

Flow:

1. User loads files via Model Setup card.
2. Frontend validates extension/type and stages both paths.
3. `load_model_files` activates the backend runner.
4. `get_focus_prediction` returns `Focused`/`Unfocused` labels per accepted packet.

Inference runs natively in Rust via ONNX Runtime. No Python sidecar is required.

---

## Application Structure

```
src/
├── adapters/
│   ├── modelConfig.ts              # Required model file definitions
│   ├── tauriClassifierAdapter.ts   # invoke("get_focus_prediction")
│   ├── tauriHeadsetAdapter.ts      # start/stop readers + event subscriptions
│   ├── tauriSessionAdapter.ts      # save/load session persistence bridge
│   ├── useHeadsetStore.ts          # Session/headset UI state
│   ├── useModelStore.ts            # Model staging + activation state
│   └── useSessionStore.ts          # Persisted session summaries
├── domain/
│   ├── eegReading.ts               # EEG/connection/prediction types
│   ├── ports.ts                    # Frontend port interfaces
│   ├── screenTypes.ts              # Screen + nav file unions
│   └── sessionSummary.ts           # Dashboard aggregate model
├── use_cases/
│   ├── useEegListener.ts           # EEG packet ingestion + signal gating
│   ├── useSessionRecorder.ts       # Row buffer, CSV build, summary build
│   ├── useSessionTimer.ts          # Elapsed timer
│   ├── useCalibration.ts           # Calibration step flow
│   └── useSignalMonitor.ts         # Toasts for signal tier transitions
├── screens/
│   ├── Layout.tsx                  # Sidebar + header + screen host
│   ├── Dashboard.tsx               # Metrics and trends
│   ├── Session.tsx                 # Live acquisition and controls
│   └── session/components/*        # Session-specific UI blocks
└── components/
     ├── chart-line-interactive.tsx  # Live 8-band chart + focus bar
     ├── chart-area-interactive.tsx  # Historical Alpha/Theta trends
     └── section-cards.tsx           # Summary metric cards

src-tauri/src/
├── adapters/
│   ├── onnx_inference_runner.rs    # ONNX/scaler runtime wrapper
│   ├── file_session_repository.rs  # sessions.json persistence
│   ├── esp32_packet_parser.rs      # Serial JSON parsing
├── domain/
│   ├── eeg_packet.rs               # EEG packet model
│   ├── focus_reading.rs            # Inference output model
│   └── session_summary.rs          # Persisted summary model
├── infrastructure/
│   ├── tauri_commands.rs           # Command surface for frontend
│   ├── esp32_reader.rs             # Serial reader loop
│   └── app_state.rs                # Shared connection/runner state
├── use_cases/
│   ├── classify_eeg_packet.rs      # Feature extraction + classify flow
│   └── manage_session_records.rs   # Save/load summary use-cases
└── lib.rs                          # App setup, plugins, invoke registration
```

---

## Session Flow (Current UI)

```
1. Pre-session setup
    - Select COM port (ESP32)
    - Enter subject name and complete calibration
    - Select Session Mode:
      - Recording Mode
      - Live Session Mode
    - If Recording Mode is selected, configure focus threshold (40-90, step 5, default 60)

2. Model setup
    - Load cerebro_unified.onnx and scaler_params.json
    - Required only for Live Session Mode
    - Optional for Recording Mode

3. Start session
    - start_esp32 is invoked with selected port

4. Acquisition and labeling
    - Reader emits eeg-data/eeg-status events
    - poorSignalLevel >= 50 packets are rejected
    - Accepted packets feed chart and recorder
    - Live Session Mode:
      - Runs get_focus_prediction
      - focusLabel derived from model output
      - focusPrediction stores model label string
    - Recording Mode:
      - Skips inference IPC
      - focusLabel derived from attention >= threshold
      - focusPrediction is "N/A"
    - Session can pause/resume without losing buffered rows
    - Mid-session disconnect triggers a save-and-end dialog

5. Export
    - Save dialog suggests Subject_YYYY-MM-DD_HH-MM-SS.csv
    - CSV is written, summary appended to sessions.json
    - Dashboard store updates immediately via addSession
```

---

## Dashboard

Dashboard uses persisted `SessionSummary` records from `sessions.json`:

| Card           | Metric Source                                                        |
| -------------- | -------------------------------------------------------------------- |
| Alpha Power    | Latest session `meanAlpha` (with delta vs previous)                  |
| Signal Quality | Latest session `signalQualityPct` (with delta vs previous)           |
| Total Sessions | Count of saved summaries                                             |
| Focus Index    | Latest session `focusedCount / sampleCount` (with delta vs previous) |

The area chart plots Alpha and Theta trends over time and shows an empty state until at least one export exists.

---

## UI Features

- Animated sidebar with collapsible icon mode
- Dark/light theming with stars background
- Live 8-band chart with band visibility toggles
- Rolling model focus indicator in session chart
- Session calibration and disconnect recovery dialogs
- Immediate dashboard refresh after export

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) stable toolchain
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Install and Run

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

- Dashboard trend chart is empty until the first successful export.
- Time-range filters can show an empty chart when no sessions fall inside the selected window.

---
