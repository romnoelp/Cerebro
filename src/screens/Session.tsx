import * as React from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { sileo } from "sileo";
import { type FocusReading, type EegBandPowers } from "@/domain";
import { IconClockHour3, IconBrain, IconDatabase } from "@tabler/icons-react";
import { motion } from "motion/react";
import { ease } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { ChartLineInteractive } from "@/components/chart-line-interactive";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { REQUIRED_MODEL_DEFINITIONS } from "@/adapters/modelConfig";
import {
  formatElapsed,
  formatSamples,
  buildExportFilename,
} from "./session/utils";
import { useSessionStore } from "@/adapters/useSessionStore";
import { useHeadsetStore } from "@/adapters/useHeadsetStore";
import { useModelStore } from "@/adapters/useModelStore";
import { createTauriClassifier } from "@/adapters/tauriClassifierAdapter";
import { createTauriSessionRepository } from "@/adapters/tauriSessionAdapter";
import { listAvailableSerialPorts } from "@/adapters/tauriHeadsetAdapter";
import { useSessionTimer } from "@/use_cases/useSessionTimer";
import { useCalibration } from "@/use_cases/useCalibration";
import {
  useEegListener,
  type EegSourceConfig,
} from "@/use_cases/useEegListener";
import { useSessionRecorder } from "@/use_cases/useSessionRecorder";
import { useSignalMonitor } from "@/use_cases/useSignalMonitor";
import { StatCard } from "./session/components/StatCard";
import { ModelManagementCard } from "./session/components/ModelManagementCard";
import { SessionControlsCard } from "./session/components/SessionControlsCard";
import { SubjectNameDialog } from "./session/components/SubjectNameDialog";
import { CalibrationDialog } from "./session/components/CalibrationDialog";
import { DisconnectDialog } from "./session/components/DisconnectDialog";

const focusClassifier = createTauriClassifier();
const sessionRepository = createTauriSessionRepository();

const SessionScreen = () => {
  // Persistent across screen navigation — backed by Zustand so navigating away
  // and back does not lose an in-progress session or reset the model state.
  const isScanning = useHeadsetStore((s) => s.isScanning);
  const setIsScanning = useHeadsetStore((s) => s.setIsScanning);
  const hasSessionStarted = useHeadsetStore((s) => s.hasSessionStarted);
  const setHasSessionStarted = useHeadsetStore((s) => s.setHasSessionStarted);
  const subjectName = useHeadsetStore((s) => s.subjectName);
  const setSubjectName = useHeadsetStore((s) => s.setSubjectName);
  const sessionMode = useHeadsetStore((s) => s.sessionMode);
  const setSessionMode = useHeadsetStore((s) => s.setSessionMode);
  const attentionThreshold = useHeadsetStore((s) => s.attentionThreshold);
  const setAttentionThreshold = useHeadsetStore((s) => s.setAttentionThreshold);
  const [showNameDialog, setShowNameDialog] = React.useState(false);
  const [showCalibrationDialog, setShowCalibrationDialog] =
    React.useState(false);
  const [shouldResetChart, setShouldResetChart] = React.useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = React.useState(false);
  const inferenceIssueCountRef = React.useRef(0);
  const lastInferenceToastAtRef = React.useRef(0);
  // Tracks whether the headset was connected at any point during this scan
  // so we only fire the disconnect dialog on mid-session drops, not on startup.
  const wasConnectedRef = React.useRef(false);

  // ── EEG source selection ──────────────────────────────────────
  const [esp32Port, setEsp32Port] = React.useState("");
  const [availablePorts, setAvailablePorts] = React.useState<string[]>([]);

  const eegSource: EegSourceConfig = { type: "esp32", portName: esp32Port };

  const loadPorts = React.useCallback(() => {
    listAvailableSerialPorts()
      .then((serialPorts) => {
        setAvailablePorts(serialPorts);
        setEsp32Port((previous) =>
          previous === "" && serialPorts.length > 0 ? serialPorts[0] : previous,
        );
      })
      .catch((error) => logger.ioError("list_serial_ports failed", error));
  }, []);

  // Populate port list once on mount so it’s ready when the user picks ESP32.
  React.useEffect(() => {
    loadPorts();
  }, [loadPorts]);

  const stagedModelMap = useModelStore((s) => s.stagedModelMap);
  const modelReady = useModelStore((s) => s.modelReady);
  const isModelRequired = useModelStore((s) => s.isModelRequired);
  const isSessionReady = useModelStore((s) => s.isSessionReady);
  const handleLoadModel = useModelStore((s) => s.handleLoadModel);
  const { displayBandPowers, rawBandPowers, isConnected, poorSignalLevel } =
    useEegListener(isScanning || showCalibrationDialog, eegSource);
  // Timer runs for the full scanning duration so the elapsed clock does not
  // freeze during brief signal dropouts. Packet acceptance and recording are
  // still gated on poorSignalLevel < 50 — only the display is decoupled.
  const hasGoodSignal = isConnected && poorSignalLevel < 50;
  const { elapsedSeconds, reset: resetTimer } = useSessionTimer(isScanning);
  useSignalMonitor({ active: isScanning, isConnected, poorSignalLevel });
  const recorder = useSessionRecorder();
  const modelRequired = isModelRequired(sessionMode);
  const modelGateSatisfied = isSessionReady(sessionMode);
  const canEditSessionSetup = !isScanning && !hasSessionStarted;
  const addSession = useSessionStore((store) => store.addSession);
  const {
    calibrationStep,
    showStartButton,
    signalFailed,
    reset: resetCalibration,
  } = useCalibration({
    active: showCalibrationDialog,
    isConnected,
    poorSignalLevel,
  });

  const reportInferenceIssue = React.useCallback(
    (summary: string, error?: unknown) => {
      inferenceIssueCountRef.current += 1;
      logger.ioError(summary, error);

      // Limit to one toast every 5s to avoid flooding at ~1 Hz packet cadence.
      const now = Date.now();
      if (now - lastInferenceToastAtRef.current >= 5000) {
        lastInferenceToastAtRef.current = now;
        const affected = inferenceIssueCountRef.current;
        sileo.error({
          title: "Model inference unstable",
          description: `Using fallback labels for ${affected} packet${affected === 1 ? "" : "s"}.`,
        });
      }
    },
    [],
  );

  const handleStartScanning = () => {
    if (hasSessionStarted) {
      setIsScanning(true);
      sileo.success({
        title: "Scanning resumed",
        description: `EEG acquisition for ${subjectName} resumed.`,
      });
    } else {
      setShowNameDialog(true);
    }
  };

  const handleNameSubmit = () => {
    if (!subjectName.trim()) {
      sileo.error({
        title: "Subject name required",
        description: "Please enter a subject name to continue.",
      });
      return;
    }
    setShowNameDialog(false);
    setShowCalibrationDialog(true);
  };

  const handleCancelSession = () => {
    setShowNameDialog(false);
    setShowCalibrationDialog(false);
    setSubjectName("");
    resetCalibration();
    sileo.info({
      title: "Session cancelled",
      description: "The session setup has been cancelled.",
    });
  };

  const handleRetryCalibration = () => {
    resetCalibration();
  };

  const handleCalibrationComplete = () => {
    setShowCalibrationDialog(false);
    recorder.resetFocusWindow();
    setShouldResetChart(true);
    setIsScanning(true);
    setHasSessionStarted(true);
    sileo.success({
      title: "Scanning started",
      description: `EEG acquisition for ${subjectName} is active.`,
    });
  };

  React.useEffect(() => {
    if (shouldResetChart) setShouldResetChart(false);
  }, [shouldResetChart]);

  // Track when the headset first connects during an active scan.
  React.useEffect(() => {
    if (isScanning && isConnected) {
      wasConnectedRef.current = true;
    }
  }, [isScanning, isConnected]);

  React.useEffect(() => {
    if (isScanning && !isConnected && wasConnectedRef.current) {
      setIsScanning(false);
      setShowDisconnectDialog(true);
    }
  }, [isScanning, isConnected]);

  // Recording mode skips inference entirely and labels rows from attention.
  // Live mode keeps model inference and stores fallback labels on failures.
  const recordEegPacket = (bandPowers: EegBandPowers) => {
    if (sessionMode === "live" && modelReady) {
      focusClassifier
        .classify(bandPowers)
        .then((focusReading: FocusReading) => {
          if (focusReading.label === 0 || focusReading.label === 1) {
            recorder.appendEegRecord(bandPowers, focusReading);
            return;
          }

          reportInferenceIssue(
            `Unexpected model label received: ${focusReading.label}`,
          );
          recorder.appendEegRecord(bandPowers, undefined);
        })
        .catch((error) => {
          reportInferenceIssue("Focus inference request failed", error);
          recorder.appendEegRecord(bandPowers, undefined);
        });
      return;
    }

    recorder.appendEegRecord(bandPowers, undefined);
  };

  const handleThresholdChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const numericValue = Number(event.target.value);
    if (Number.isNaN(numericValue)) return;
    setAttentionThreshold(numericValue);
  };

  React.useEffect(() => {
    if (!isScanning || !rawBandPowers) return;
    recordEegPacket(rawBandPowers);
    // rawBandPowers reference changes on every new EEG packet — that is the
    // intended trigger; suppressing the exhaustive-deps warning is deliberate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawBandPowers]);

  const signalMessage = !isConnected
    ? "Could not open the serial port. Make sure the ESP32 is connected via USB and the correct COM port is selected."
    : poorSignalLevel >= 200
      ? "Connected but no headset was detected. Turn on the headset and make sure it is properly worn."
      : "Headset connected but signal quality is poor. Adjust the headband and try again.";

  /** To clear all session state after the recording ends without any data to save. */
  const resetAfterSession = () => {
    recorder.clearRecording();
    resetTimer();
    setSubjectName("");
    setHasSessionStarted(false);
    setShouldResetChart(true);
  };

  /**
   * To write the accumulated CSV to disk and append the session summary to
   * the local index. Returns true on success so callers can perform
   * source-specific teardown (e.g. stopping the scanner) only on success.
   */
  const persistAndResetSession = async (
    successTitle: string,
  ): Promise<boolean> => {
    const selectedPath = await save({
      filters: [{ name: "CSV Data", extensions: ["csv"] }],
      defaultPath: buildExportFilename(subjectName),
    });
    if (!selectedPath) return false;

    const csvPath = selectedPath as string;
    const summary = recorder.buildSessionSummary({
      subjectName,
      durationSecs: elapsedSeconds,
      csvPath,
    });

    await sessionRepository.saveSession({
      csvPath,
      csvContent: recorder.buildCsvString(),
      summary,
    });
    addSession(summary);
    resetAfterSession();

    sileo.success({
      title: successTitle,
      description: `Saved to ${csvPath.split(/[\\/]/).pop()}.`,
    });
    return true;
  };

  const handleStopScanning = () => {
    // Clear the ref before the state update so any race between
    // setIsScanning(false) and a late setIsConnected(false) from the
    // useEegListener teardown cannot trigger the disconnect dialog.
    wasConnectedRef.current = false;
    setIsScanning(false);
    sileo.info({
      title: "Scanning paused",
      description: "Signal acquisition has been paused. Click Start to resume.",
    });
  };

  const handleDisconnectSaveAndEnd = async () => {
    setShowDisconnectDialog(false);
    wasConnectedRef.current = false;
    if (recorder.rowCount === 0) {
      resetAfterSession();
      return;
    }
    try {
      await persistAndResetSession("Session saved");
    } catch (error) {
      logger.ioError("Disconnect save failed", error);
      sileo.error({
        title: "Export failed",
        description: "An error occurred while saving the file.",
      });
    }
  };

  const handleExport = async () => {
    try {
      const saved = await persistAndResetSession("Data exported");
      if (saved) setIsScanning(false);
    } catch (error) {
      logger.ioError("Export failed", error);
      sileo.error({
        title: "Export failed",
        description: "An error occurred while saving the file.",
      });
    }
  };

  return (
    <motion.div
      className="flex flex-1 flex-col min-h-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: ease }}>
      <div className="@container/main flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex flex-col gap-2 py-2 pb-2 flex-1 min-h-0">
          <div className="flex items-end justify-between px-4 lg:px-6 shrink-0">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl font-semibold tracking-tight">Session</h1>
              <p className="text-xs text-muted-foreground tracking-wide">
                EEG acquisition, recording, and live inference
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isScanning && (
                <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/20 backdrop-blur-sm px-3 py-1">
                  <span
                    className={cn(
                      "relative inline-flex h-1.5 w-1.5 rounded-full transition-colors",
                      isConnected
                        ? poorSignalLevel < 50
                          ? "bg-emerald-500"
                          : poorSignalLevel >= 200
                            ? "bg-foreground/30"
                            : "bg-amber-500"
                        : "bg-foreground/30",
                    )}
                  />
                  <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
                    {isConnected
                      ? poorSignalLevel < 50
                        ? "Signal OK"
                        : poorSignalLevel >= 200
                          ? "No Headset"
                          : "Poor Signal"
                      : "No ESP32"}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/20 backdrop-blur-sm px-3 py-1">
                <span className="relative flex h-1.5 w-1.5">
                  {isScanning && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/50 opacity-75" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex h-1.5 w-1.5 rounded-full transition-colors",
                      isScanning ? "bg-foreground/70" : "bg-foreground/40",
                    )}
                  />
                </span>
                <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
                  {isScanning ? "Scanning" : "Idle"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 px-4 lg:px-6 shrink-0">
            <StatCard
              icon={<IconClockHour3 className="size-3.5" />}
              label="Elapsed"
              value={formatElapsed(elapsedSeconds)}
              isActive={isScanning}
            />
            <StatCard
              icon={<IconDatabase className="size-3.5" />}
              label="Samples"
              value={formatSamples(recorder.rowCount)}
              isActive={isScanning}
            />
            <StatCard
              icon={<IconBrain className="size-3.5" />}
              label="Models"
              value={
                <>
                  {Object.values(stagedModelMap).filter(Boolean).length}
                  <span className="text-sm font-normal text-muted-foreground/60">
                    /{REQUIRED_MODEL_DEFINITIONS.length}
                  </span>
                </>
              }
              isActive={modelReady}
              highlight={modelReady}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 pb-3 flex-1 min-h-0 @3xl/main:grid-cols-[1fr_400px] @3xl/main:items-stretch">
            <ChartLineInteractive
              isRunning={isScanning}
              shouldReset={shouldResetChart}
              liveData={displayBandPowers}
              modelFocusState={recorder.rollingFocusVote}
              modelFocusLevel={recorder.rollingFocusLevel}
              className="flex-1 min-h-0"
            />
            <div
              className={cn(
                "flex min-w-0 flex-col gap-3",
                "overflow-y-auto overflow-x-hidden",
              )}>
              {sessionMode === "live" && (
                <ModelManagementCard
                  loadedModels={stagedModelMap}
                  modelReady={modelReady}
                  modelRequired={modelRequired}
                  onLoadModel={handleLoadModel}
                />
              )}

              <div className="rounded-xl border border-border/50 bg-background/10 backdrop-blur-md px-4 py-3.5">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      Session Mode
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">
                      Select mode before starting the session.
                    </p>
                  </div>

                  <ToggleGroup
                    type="single"
                    value={sessionMode}
                    onValueChange={(value) => {
                      if (value === "recording" || value === "live") {
                        setSessionMode(value);
                      }
                    }}
                    disabled={!canEditSessionSetup}
                    className="w-full"
                    variant="outline">
                    <ToggleGroupItem
                      value="recording"
                      className="flex-1 justify-center text-xs">
                      Recording Mode
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="live"
                      className="flex-1 justify-center text-xs">
                      Live Session Mode
                    </ToggleGroupItem>
                  </ToggleGroup>

                  <div className="space-y-1 rounded-md border border-border/40 bg-background/20 px-2.5 py-2">
                    <p className="text-[11px] font-medium">Recording Mode</p>
                    <p className="text-[10px] text-muted-foreground/70 leading-snug">
                      Captures labeled EEG data using the headset&apos;s
                      attention score. Use this to collect training data.
                    </p>
                  </div>

                  <div className="space-y-1 rounded-md border border-border/40 bg-background/20 px-2.5 py-2">
                    <p className="text-[11px] font-medium">Live Session Mode</p>
                    <p className="text-[10px] text-muted-foreground/70 leading-snug">
                      Classifies your focus state in real time using the trained
                      model.
                    </p>
                  </div>

                  {sessionMode === "recording" && (
                    <div className="space-y-1.5 pt-1">
                      <label
                        htmlFor="attention-threshold"
                        className="text-[11px] font-medium">
                        Focus threshold (attention score)
                      </label>
                      <Input
                        id="attention-threshold"
                        type="number"
                        min={40}
                        max={90}
                        step={5}
                        value={attentionThreshold}
                        onChange={handleThresholdChange}
                        disabled={!canEditSessionSetup}
                        className="h-8 text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground/70 leading-snug">
                        Packets with attention &gt;= this value are labeled
                        Focused.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <SessionControlsCard
                isScanning={isScanning}
                hasStarted={hasSessionStarted}
                allLoaded={modelGateSatisfied && esp32Port !== ""}
                onStartScanning={handleStartScanning}
                onStopScanning={handleStopScanning}
                onExport={handleExport}
                esp32Port={esp32Port}
                onEsp32PortChange={setEsp32Port}
                availablePorts={availablePorts}
                onRefreshPorts={loadPorts}
              />
            </div>
          </div>
        </div>
      </div>

      <SubjectNameDialog
        open={showNameDialog}
        subjectName={subjectName}
        onOpenChange={(open) => {
          if (!open) handleCancelSession();
        }}
        onSubjectNameChange={setSubjectName}
        onSubmit={handleNameSubmit}
        onCancel={handleCancelSession}
      />

      <CalibrationDialog
        open={showCalibrationDialog}
        calibrationStep={calibrationStep}
        showStartButton={showStartButton}
        signalFailed={signalFailed}
        signalMessage={signalMessage}
        onOpenChange={(open) => {
          if (!open) handleCancelSession();
        }}
        onRetry={handleRetryCalibration}
        onComplete={handleCalibrationComplete}
        onCancel={handleCancelSession}
      />

      <DisconnectDialog
        open={showDisconnectDialog}
        sampleCount={recorder.rowCount}
        onSaveAndEnd={handleDisconnectSaveAndEnd}
      />
    </motion.div>
  );
};

export default SessionScreen;
