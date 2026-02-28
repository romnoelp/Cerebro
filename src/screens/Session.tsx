import * as React from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { sileo } from "sileo";
import { type FocusPrediction, type TgcBandData } from "@/types";
import { IconClockHour3, IconBrain, IconDatabase } from "@tabler/icons-react";
import { motion } from "motion/react";
import { EASE } from "@/lib/constants";
import { ChartLineInteractive } from "@/components/chart-line-interactive";
import { cn } from "@/lib/utils";
import { requiredModels } from "./session/constants";
import {
  formatElapsed,
  formatSamples,
  buildExportFilename,
} from "./session/utils";
import { useSessionTimer } from "./session/hooks/useSessionTimer";
import { useModelLoader } from "./session/hooks/useModelLoader";
import { useCalibration } from "./session/hooks/useCalibration";
import { useTgcConnection } from "./session/hooks/useTgcConnection";
import { useSessionRecorder } from "./session/hooks/useSessionRecorder";
import { StatCard } from "./session/components/StatCard";
import { ModelManagementCard } from "./session/components/ModelManagementCard";
import { SessionControlsCard } from "./session/components/SessionControlsCard";
import { SubjectNameDialog } from "./session/components/SubjectNameDialog";
import { CalibrationDialog } from "./session/components/CalibrationDialog";

const SessionScreen = () => {
  const [isScanning, setIsScanning] = React.useState(false);
  const [hasStarted, setHasStarted] = React.useState(false);
  const [subjectName, setSubjectName] = React.useState("");
  const [showNameDialog, setShowNameDialog] = React.useState(false);
  const [showCalibrationDialog, setShowCalibrationDialog] =
    React.useState(false);
  const [shouldResetChart, setShouldResetChart] = React.useState(false);

  const {
    elapsed,
    sampleCount,
    reset: resetTimer,
  } = useSessionTimer(isScanning);
  const { loadedModels, modelReady, handleLoadModel } = useModelLoader();
  const { liveData, rawData, isConnected, poorSignalLevel } = useTgcConnection(
    isScanning || showCalibrationDialog,
  );
  const recorder = useSessionRecorder();
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

  const handleStartScanning = () => {
    if (hasStarted) {
      setIsScanning(true);
      sileo.success({
        title: "Scanning resumed",
        description: `Live EEG acquisition for ${subjectName} resumed.`,
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
    setShouldResetChart(true);
    setIsScanning(true);
    setHasStarted(true);
    sileo.success({
      title: "Scanning started",
      description: `Live EEG acquisition for ${subjectName} is active.`,
    });
  };

  React.useEffect(() => {
    if (shouldResetChart) setShouldResetChart(false);
  }, [shouldResetChart]);

  // Runs inference when the model is ready; records label -1 when it is not,
  // so no EEG packet is silently dropped.
  const recordEegPacket = (eegPayload: TgcBandData) => {
    if (modelReady) {
      invoke<FocusPrediction>("get_focus_prediction", { payload: eegPayload })
        .then((prediction) => recorder.record(eegPayload, prediction))
        .catch(() => recorder.record(eegPayload, undefined));
    } else {
      recorder.record(eegPayload, undefined);
    }
  };

  // Record one row per accepted TGC packet while the session is active.
  React.useEffect(() => {
    if (!isScanning || !rawData) return;
    recordEegPacket(rawData);
    // rawData reference changes on every new packet — that's the intended trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData]);

  const signalMessage = !isConnected
    ? "Could not reach ThinkGear Connector. Ensure it is running before starting a session."
    : "Headset connected but signal quality is poor. Adjust the headband and try again.";

  const handleStopScanning = () => {
    setIsScanning(false);
    sileo.info({
      title: "Scanning paused",
      description: "Signal acquisition has been paused. Click Start to resume.",
    });
  };

  const handleExport = async () => {
    try {
      const path = await save({
        filters: [{ name: "CSV Data", extensions: ["csv"] }],
        defaultPath: buildExportFilename(subjectName),
      });
      if (!path) return;

      await invoke("write_csv", { path, content: recorder.buildCsv() });

      recorder.clear();
      resetTimer();
      setSubjectName("");
      setHasStarted(false);
      setIsScanning(false);
      setShouldResetChart(true);

      sileo.success({
        title: "Data exported",
        description: `Saved to ${(path as string).split(/[\\/]/).pop()}. All data cleared.`,
      });
    } catch {
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
      transition={{ duration: 0.3, ease: EASE }}>
      <div className="@container/main flex flex-col gap-2">
        <div className="flex flex-col gap-2 py-2 pb-2">
          <div className="flex items-end justify-between px-4 lg:px-6">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl font-semibold tracking-tight">Session</h1>
              <p className="text-xs text-muted-foreground tracking-wide">
                Live EEG acquisition &amp; model inference
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
                          : "bg-amber-500"
                        : "bg-foreground/30",
                    )}
                  />
                  <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
                    {isConnected
                      ? poorSignalLevel < 50
                        ? "Signal OK"
                        : "Poor Signal"
                      : "No Headset"}
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

          <div className="grid grid-cols-3 gap-3 px-4 lg:px-6">
            <StatCard
              icon={<IconClockHour3 className="size-3.5" />}
              label="Elapsed"
              value={formatElapsed(elapsed)}
              isActive={isScanning}
            />
            <StatCard
              icon={<IconDatabase className="size-3.5" />}
              label="Samples"
              value={formatSamples(sampleCount)}
              isActive={isScanning}
            />
            <StatCard
              icon={<IconBrain className="size-3.5" />}
              label="Models"
              value={
                <>
                  {Object.values(loadedModels).filter(Boolean).length}
                  <span className="text-sm font-normal text-muted-foreground/60">
                    /{requiredModels.length}
                  </span>
                </>
              }
              isActive={modelReady}
              highlight={modelReady}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 @3xl/main:grid-cols-[1fr_320px] @3xl/main:items-start">
            <ChartLineInteractive
              isRunning={isScanning}
              shouldReset={shouldResetChart}
              hasStarted={hasStarted}
              liveData={liveData}
              className="h-full"
            />
            <div className="flex flex-col gap-3 h-full">
              <ModelManagementCard
                loadedModels={loadedModels}
                modelReady={modelReady}
                onLoadModel={handleLoadModel}
              />

              <SessionControlsCard
                isScanning={isScanning}
                hasStarted={hasStarted}
                allLoaded={modelReady}
                onStartScanning={handleStartScanning}
                onStopScanning={handleStopScanning}
                onExport={handleExport}
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
    </motion.div>
  );
};

export default SessionScreen;
