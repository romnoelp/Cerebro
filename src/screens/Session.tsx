import * as React from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { sileo } from "sileo";
import { IconClockHour3, IconBrain, IconDatabase } from "@tabler/icons-react";
import { motion } from "motion/react";
import { ChartLineInteractive } from "@/components/chart-line-interactive";
import { cn } from "@/lib/utils";
import { requiredModels } from "./session/constants";
import { formatElapsed, formatSamples } from "./session/utils";
import { useSessionTimer } from "./session/hooks/useSessionTimer";
import { useModelLoader } from "./session/hooks/useModelLoader";
import { useCalibration } from "./session/hooks/useCalibration";
import { StatCard } from "./session/components/StatCard";
import { ModelManagementCard } from "./session/components/ModelManagementCard";
import { SessionControlsCard } from "./session/components/SessionControlsCard";
import { PatientNameDialog } from "./session/components/PatientNameDialog";
import { CalibrationDialog } from "./session/components/CalibrationDialog";

const SessionScreen = () => {
  const [isScanning, setIsScanning] = React.useState(false);
  const [hasStarted, setHasStarted] = React.useState(false);
  const [patientName, setPatientName] = React.useState("");
  const [showNameDialog, setShowNameDialog] = React.useState(false);
  const [showCalibrationDialog, setShowCalibrationDialog] =
    React.useState(false);
  const [shouldResetChart, setShouldResetChart] = React.useState(false);

  const {
    elapsed,
    sampleCount,
    reset: resetTimer,
  } = useSessionTimer(isScanning);
  const { loadedModels, allLoaded, handleLoadModel } = useModelLoader();
  const {
    calibrationStep,
    showStartButton,
    reset: resetCalibration,
  } = useCalibration(showCalibrationDialog);

  const handleStartScanning = () => {
    // If already started (paused), just resume
    if (hasStarted) {
      setIsScanning(true);
      sileo.success({
        title: "Scanning resumed",
        description: `Live EEG acquisition for ${patientName} resumed.`,
      });
    } else {
      // Fresh start - show name dialog
      setShowNameDialog(true);
    }
  };

  const handleNameSubmit = () => {
    if (!patientName.trim()) {
      sileo.error({
        title: "Patient name required",
        description: "Please enter a patient name to continue.",
      });
      return;
    }
    setShowNameDialog(false);
    setShowCalibrationDialog(true);
  };

  const handleCancelSession = () => {
    setShowNameDialog(false);
    setShowCalibrationDialog(false);
    setPatientName("");
    resetCalibration();
    sileo.info({
      title: "Session cancelled",
      description: "The session setup has been cancelled.",
    });
  };

  const handleCalibrationComplete = () => {
    setShowCalibrationDialog(false);
    setShouldResetChart(true);
    setIsScanning(true);
    setHasStarted(true);
    sileo.success({
      title: "Scanning started",
      description: `Live EEG acquisition for ${patientName} is active.`,
    });
  };

  // Reset chart flag after it's been consumed
  React.useEffect(() => {
    if (shouldResetChart) {
      setShouldResetChart(false);
    }
  }, [shouldResetChart]);

  const handleStopScanning = () => {
    setIsScanning(false);
    sileo.info({
      title: "Scanning paused",
      description: "Signal acquisition has been paused. Click Start to resume.",
    });
  };

  const handleExport = async () => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
      const filename = patientName.trim()
        ? `${patientName.trim().replace(/\s+/g, "_")}_${dateStr}_${timeStr}.csv`
        : `session_${dateStr}_${timeStr}.csv`;

      const path = await save({
        filters: [{ name: "CSV Data", extensions: ["csv"] }],
        defaultPath: filename,
      });
      if (!path) return;

      // Clear all data after successful export
      resetTimer();
      setPatientName("");
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
      className="flex flex-1 flex-col min-h-0 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      <div className="@container/main flex flex-col gap-4">
        <div className="flex flex-col gap-2 py-3 pb-6">
          {/* Page header */}
          <div className="flex items-end justify-between px-4 lg:px-6">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl font-semibold tracking-tight">Session</h1>
              <p className="text-xs text-muted-foreground tracking-wide">
                Live EEG acquisition &amp; model inference
              </p>
            </div>
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

          {/* Stat strip */}
          <div className="grid grid-cols-3 gap-3 px-4 lg:px-6">
            {/* Session Time */}
            <StatCard
              icon={<IconClockHour3 className="size-3.5" />}
              label="Elapsed"
              value={formatElapsed(elapsed)}
              isActive={isScanning}
            />

            {/* Samples */}
            <StatCard
              icon={<IconDatabase className="size-3.5" />}
              label="Samples"
              value={formatSamples(sampleCount)}
              isActive={isScanning}
            />

            {/* Models loaded */}
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
              isActive={allLoaded}
              highlight={allLoaded}
            />
          </div>

          {/* Main content: chart + controls */}
          <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 @3xl/main:grid-cols-[1fr_320px] @3xl/main:items-start">
            {/* Left — Live EEG chart */}
            <ChartLineInteractive
              isRunning={isScanning}
              shouldReset={shouldResetChart}
              hasStarted={hasStarted}
              className="h-full"
            />

            {/* Right — Model management + session controls */}
            <div className="flex flex-col gap-3 h-full">
              <ModelManagementCard
                loadedModels={loadedModels}
                allLoaded={allLoaded}
                onLoadModel={handleLoadModel}
              />

              <SessionControlsCard
                isScanning={isScanning}
                hasStarted={hasStarted}
                allLoaded={allLoaded}
                onStartScanning={handleStartScanning}
                onStopScanning={handleStopScanning}
                onExport={handleExport}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Patient Name Dialog */}
      <PatientNameDialog
        open={showNameDialog}
        patientName={patientName}
        onOpenChange={(open) => {
          if (!open) handleCancelSession();
        }}
        onPatientNameChange={setPatientName}
        onSubmit={handleNameSubmit}
        onCancel={handleCancelSession}
      />

      {/* Calibration Dialog */}
      <CalibrationDialog
        open={showCalibrationDialog}
        calibrationStep={calibrationStep}
        showStartButton={showStartButton}
        onOpenChange={(open) => {
          if (!open) handleCancelSession();
        }}
        onComplete={handleCalibrationComplete}
        onCancel={handleCancelSession}
      />
    </motion.div>
  );
};

export default SessionScreen;
