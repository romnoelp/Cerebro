import * as React from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { sileo } from "sileo";
import {
  IconUpload,
  IconClockHour3,
  IconBrain,
  IconDatabase,
} from "@tabler/icons-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import neuralNetwork from "@/assets/neuralNetwork.svg";
import { ChartSpline } from "@/components/animate-ui/icons/chart-spline";
import { TimerOff } from "@/components/animate-ui/icons/timer-off";
import { Download } from "@/components/animate-ui/icons/download";
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLineInteractive } from "@/components/chart-line-interactive";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const REQUIRED_MODELS = [
  {
    key: "ddqn" as const,
    filename: "ddqn_best_checkpoint.pt",
    label: "DDQN Policy Model",
    description: "Deep Q-Network decision model",
  },
  {
    key: "tcn" as const,
    filename: "tcn_best_checkpoint.pt",
    label: "TCN Feature Extractor",
    description: "Temporal Convolutional Network",
  },
  {
    key: "scaler" as const,
    filename: "scaler.pkl",
    label: "Signal Scaler",
    description: "EEG signal preprocessing scaler",
  },
] as const;

const CALIBRATION_STEPS = [
  "Participant seated comfortably...",
  "Checking signal integrity...",
  "Baseline calibration in progress...",
  "System ready for acquisition",
];

const STEP_DURATION = 1400;
const EASE = [0.16, 1, 0.3, 1] as const;

type ModelKey = (typeof REQUIRED_MODELS)[number]["key"];

const SessionScreen = () => {
  const [loadedModels, setLoadedModels] = useState<Record<ModelKey, boolean>>({
    ddqn: false,
    tcn: false,
    scaler: false,
  });
  const [isScanning, setIsScanning] = React.useState(false);
  const [hasStarted, setHasStarted] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [sampleCount, setSampleCount] = React.useState(0);
  const [patientName, setPatientName] = React.useState("");
  const [showNameDialog, setShowNameDialog] = React.useState(false);
  const [showCalibrationDialog, setShowCalibrationDialog] =
    React.useState(false);
  const [calibrationStep, setCalibrationStep] = React.useState(0);
  const [showStartButton, setShowStartButton] = React.useState(false);
  const [shouldResetChart, setShouldResetChart] = React.useState(false);

  const allLoaded = Object.values(loadedModels).every(Boolean);

  // Elapsed timer
  React.useEffect(() => {
    if (!isScanning) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isScanning]);

  // Simulated sample counter (~512 Hz NeuroSky rate, shown as ~512 samples/s)
  React.useEffect(() => {
    if (!isScanning) return;
    const id = setInterval(() => setSampleCount((s) => s + 512), 1000);
    return () => clearInterval(id);
  }, [isScanning]);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const formatSamples = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const handleLoadModel = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Model Files", extensions: ["pt", "pkl"] }],
      });

      if (!selected) return;

      const path = selected as string;
      const filename = path.split(/[\\/]/).pop() ?? "";

      const match = REQUIRED_MODELS.find((m) => m.filename === filename);

      if (!match) {
        sileo.error({
          title: "Unrecognized model file",
          description: `"${filename}" is not a required model file.`,
        });
        return;
      }

      if (loadedModels[match.key]) {
        sileo.info({
          title: `${match.label} already loaded`,
          description: "This model is already registered.",
        });
        return;
      }

      const next = { ...loadedModels, [match.key]: true };
      setLoadedModels(next);

      const nowAllLoaded = Object.values(next).every(Boolean);

      if (nowAllLoaded) {
        sileo.success({
          title: "All models loaded",
          description: "Session can now be started.",
        });
      } else {
        sileo.success({
          title: `${match.label} loaded`,
          description: match.filename,
        });
      }
    } catch {
      sileo.error({
        title: "Failed to open file",
        description: "An error occurred while opening the file dialog.",
      });
    }
  };

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
    setCalibrationStep(0);
    setShowStartButton(false);
  };

  const handleCancelSession = () => {
    setShowNameDialog(false);
    setShowCalibrationDialog(false);
    setPatientName("");
    setCalibrationStep(0);
    setShowStartButton(false);
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

  // Calibration step animation
  React.useEffect(() => {
    if (!showCalibrationDialog) return;

    if (calibrationStep < CALIBRATION_STEPS.length - 1) {
      const t = setTimeout(
        () => setCalibrationStep((i) => i + 1),
        STEP_DURATION,
      );
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setShowStartButton(true), STEP_DURATION);
      return () => clearTimeout(t);
    }
  }, [showCalibrationDialog, calibrationStep]);

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
      setElapsed(0);
      setSampleCount(0);
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
            <Card className="border border-border/40 bg-background/20 backdrop-blur-sm gap-2 py-3.5">
              <CardHeader className="px-4 pb-0 gap-1.5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <IconClockHour3 className="size-3.5" />
                  <span className="text-[10px] uppercase tracking-widest font-medium">
                    Elapsed
                  </span>
                </div>
                <CardTitle
                  className={cn(
                    "text-xl font-bold tabular-nums font-mono transition-colors",
                    isScanning ? "text-foreground" : "text-muted-foreground/50",
                  )}>
                  {formatElapsed(elapsed)}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Samples */}
            <Card className="border border-border/40 bg-background/20 backdrop-blur-sm gap-2 py-3.5">
              <CardHeader className="px-4 pb-0 gap-1.5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <IconDatabase className="size-3.5" />
                  <span className="text-[10px] uppercase tracking-widest font-medium">
                    Samples
                  </span>
                </div>
                <CardTitle
                  className={cn(
                    "text-xl font-bold tabular-nums font-mono transition-colors",
                    isScanning ? "text-foreground" : "text-muted-foreground/50",
                  )}>
                  {formatSamples(sampleCount)}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Models loaded */}
            <Card
              className={cn(
                "gap-2 py-3.5 transition-colors duration-500 backdrop-blur-sm",
                allLoaded
                  ? "border border-foreground/50 bg-foreground/5"
                  : "border border-border/40 bg-background/20",
              )}>
              <CardHeader className="px-4 pb-0 gap-1.5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <IconBrain className="size-3.5" />
                  <span className="text-[10px] uppercase tracking-widest font-medium">
                    Models
                  </span>
                </div>
                <CardTitle
                  className={cn(
                    "text-xl font-bold tabular-nums font-mono transition-colors duration-500",
                    allLoaded ? "text-foreground" : "text-foreground",
                  )}>
                  {Object.values(loadedModels).filter(Boolean).length}
                  <span className="text-sm font-normal text-muted-foreground/60">
                    /{REQUIRED_MODELS.length}
                  </span>
                </CardTitle>
              </CardHeader>
            </Card>
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
              {/* Model management card */}
              <Card className="border border-border/40 bg-background/20 backdrop-blur-sm gap-2 py-3.5 flex-1">
                <CardHeader className="px-4 pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-foreground/5 border border-border/40">
                        <IconUpload className="size-3.5 text-muted-foreground/70" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold leading-tight">
                          Model Setup
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">
                          Load required model files
                        </p>
                      </div>
                    </div>
                    <LiquidButton
                      size="sm"
                      variant="default"
                      className="cursor-pointer gap-1.5"
                      onClick={handleLoadModel}
                      disabled={allLoaded}>
                      Load Model
                    </LiquidButton>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 px-4 pb-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-0.5 bg-border/40 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          allLoaded ? "bg-foreground/80" : "bg-foreground/30",
                        )}
                        style={{
                          width: `${(Object.values(loadedModels).filter(Boolean).length / REQUIRED_MODELS.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-mono tabular-nums shrink-0 transition-colors",
                        allLoaded
                          ? "text-foreground/70"
                          : "text-muted-foreground/60",
                      )}>
                      {Object.values(loadedModels).filter(Boolean).length}/
                      {REQUIRED_MODELS.length}
                    </span>
                  </div>

                  {/* Model rows */}
                  <div className="flex flex-col gap-1.5 flex-1 justify-center">
                    {REQUIRED_MODELS.map((model) => (
                      <div
                        key={model.key}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-1 transition-all duration-300",
                          loadedModels[model.key]
                            ? "border-foreground/30 bg-foreground/5"
                            : "border-border/20 bg-foreground/2",
                        )}>
                        <div
                          className={cn(
                            "size-2 rounded-full shrink-0 transition-all duration-500",
                            loadedModels[model.key]
                              ? "bg-foreground/70"
                              : "bg-muted-foreground/25",
                          )}
                        />
                        <div className="flex flex-col gap-0 min-w-0 flex-1">
                          <span
                            className={cn(
                              "text-xs font-medium truncate transition-colors leading-snug",
                              loadedModels[model.key]
                                ? "text-foreground"
                                : "text-muted-foreground/70",
                            )}>
                            {model.label}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/40 truncate leading-tight">
                            {model.filename}
                          </span>
                        </div>
                        {loadedModels[model.key] && (
                          <span className="text-[9px] font-semibold font-mono text-foreground/60 shrink-0 tracking-wider">
                            READY
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Session controls card */}
              <Card className="border border-border/40 bg-background/20 backdrop-blur-sm gap-2 py-3.5">
                <CardHeader className="px-4 pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-foreground/5 border border-border/40">
                        <ChartSpline className="size-3.5 text-muted-foreground/70" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold leading-tight">
                          Session Controls
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">
                          Acquisition &amp; data export
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 rounded-full transition-colors duration-300",
                          isScanning
                            ? "bg-foreground/70 animate-pulse"
                            : "bg-muted-foreground/30",
                        )}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-mono tracking-wider transition-colors",
                          isScanning
                            ? "text-foreground/70"
                            : "text-muted-foreground/50",
                        )}>
                        {isScanning ? "LIVE" : "IDLE"}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-1.5 px-4 pb-0">
                  {/* Start/Resume Scanning */}
                  <div
                    onClick={() =>
                      !allLoaded || isScanning ? null : handleStartScanning()
                    }
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-300",
                      allLoaded && !isScanning
                        ? "border-foreground/30 bg-foreground/5 cursor-pointer hover:bg-foreground/10"
                        : "border-border/20 bg-foreground/2 cursor-not-allowed opacity-50",
                    )}>
                    <div className="flex size-7 items-center justify-center rounded-md bg-background/40">
                      <ChartSpline className="size-4 text-muted-foreground/70" />
                    </div>
                    <div className="flex flex-col gap-0 min-w-0 flex-1">
                      <span className="text-xs font-medium">
                        {hasStarted ? "Resume Scanning" : "Start Scanning"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        Begin EEG acquisition
                      </span>
                    </div>
                  </div>

                  {/* Pause Scanning */}
                  <div
                    onClick={() => (!isScanning ? null : handleStopScanning())}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-300",
                      isScanning
                        ? "border-foreground/30 bg-foreground/5 cursor-pointer hover:bg-foreground/10"
                        : "border-border/20 bg-foreground/2 cursor-not-allowed opacity-50",
                    )}>
                    <div className="flex size-7 items-center justify-center rounded-md bg-background/40">
                      <TimerOff className="size-4 text-muted-foreground/70" />
                    </div>
                    <div className="flex flex-col gap-0 min-w-0 flex-1">
                      <span className="text-xs font-medium">
                        Pause Scanning
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        Temporarily halt acquisition
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-border/40 my-0.5" />

                  {/* Export Data */}
                  <div
                    onClick={() =>
                      isScanning || !hasStarted ? null : handleExport()
                    }
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-300",
                      !isScanning && hasStarted
                        ? "border-foreground/30 bg-foreground/5 cursor-pointer hover:bg-foreground/10"
                        : "border-border/20 bg-foreground/2 cursor-not-allowed opacity-50",
                    )}>
                    <div className="flex size-7 items-center justify-center rounded-md bg-background/40">
                      <Download className="size-4 text-muted-foreground/70" />
                    </div>
                    <div className="flex flex-col gap-0 min-w-0 flex-1">
                      <span className="text-xs font-medium">Export Data</span>
                      <span className="text-[10px] text-muted-foreground/60">
                        Save session results
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Name Dialog */}
      <Dialog
        open={showNameDialog}
        onOpenChange={(open) => {
          if (!open) handleCancelSession();
        }}>
        <DialogContent className="sm:max-w-md border border-border/40 bg-background/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Patient Information</DialogTitle>
            <DialogDescription>
              Enter the participant's name to begin the session.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="patient-name">Patient Name</Label>
              <Input
                id="patient-name"
                placeholder="Enter patient name..."
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleNameSubmit();
                  }
                }}
                className="border-border/40"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCancelSession}
                variant="outline"
                className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleNameSubmit} className="flex-1">
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calibration Dialog */}
      <Dialog
        open={showCalibrationDialog}
        onOpenChange={(open) => {
          if (!open) handleCancelSession();
        }}>
        <DialogContent className="sm:max-w-lg border border-border/40 bg-background/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-8 pt-12 pb-6">
            {/* Neural Network Icon with rotating rings */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center">
                <motion.div
                  className="absolute rounded-full border border-dashed border-foreground/15"
                  style={{ width: 108, height: 108 }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 9,
                    ease: "linear",
                    repeat: Infinity,
                  }}
                />
                <motion.div
                  className="absolute rounded-full border border-foreground/[0.07]"
                  style={{ width: 140, height: 140 }}
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 14,
                    ease: "linear",
                    repeat: Infinity,
                  }}
                />
                <img
                  src={neuralNetwork}
                  alt="Neural Network"
                  className="relative z-10 w-14 h-14 dark:invert opacity-60"
                />
              </div>
              <span className="text-[10px] font-mono font-semibold tracking-[0.3em] uppercase text-muted-foreground/60">
                Calibrating
              </span>
            </div>

            {/* Instructions */}
            <div className="flex flex-col gap-3 text-center">
              <h3 className="text-sm font-semibold">Participant Calibration</h3>
              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                <p>Please ensure the participant is:</p>
                <ul className="flex flex-col gap-1 list-none">
                  <li>• Seated comfortably</li>
                  <li>• Avoiding sudden movements</li>
                  <li>• Breathing normally and steadily</li>
                  <li>• Relaxed and focused</li>
                </ul>
              </div>
            </div>

            {/* Calibration steps */}
            <div className="flex flex-col gap-2 w-full font-mono">
              {CALIBRATION_STEPS.map((step, i) => {
                if (i > calibrationStep) return null;
                const isDone = i < calibrationStep;
                const isCurrent = i === calibrationStep;
                return (
                  <motion.div
                    key={i}
                    className="flex items-center gap-2.5"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      transition: { duration: 0.3, ease: EASE },
                    }}>
                    <span
                      className={cn(
                        "text-xs shrink-0 w-3",
                        isDone ? "text-foreground/30" : "text-muted-foreground",
                      )}>
                      {isDone ? "✓" : "›"}
                    </span>
                    <span
                      className={cn(
                        "text-xs tracking-wide",
                        isDone
                          ? "text-muted-foreground/35"
                          : "text-muted-foreground",
                      )}>
                      {step}
                    </span>
                    {isCurrent && (
                      <motion.span
                        className="ml-0.5 inline-block w-1.25 h-3.25 bg-foreground/50 shrink-0"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{
                          duration: 0.75,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Cancel button - always visible during calibration */}
            {!showStartButton && (
              <Button
                onClick={handleCancelSession}
                variant="outline"
                className="w-full">
                Cancel Session
              </Button>
            )}

            {/* Start button - appears after calibration */}
            <AnimatePresence>
              {showStartButton && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, ease: EASE },
                  }}
                  className="w-full flex flex-col gap-2">
                  <Button
                    onClick={handleCalibrationComplete}
                    className="w-full bg-foreground text-background hover:bg-foreground/90">
                    Begin Acquisition
                  </Button>
                  <Button
                    onClick={handleCancelSession}
                    variant="outline"
                    className="w-full">
                    Cancel
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SessionScreen;
