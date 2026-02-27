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
import { ChartSpline } from "@/components/animate-ui/icons/chart-spline";
import { TimerOff } from "@/components/animate-ui/icons/timer-off";
import { Download } from "@/components/animate-ui/icons/download";
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLineInteractive } from "@/components/chart-line-interactive";
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

type ModelKey = (typeof REQUIRED_MODELS)[number]["key"];

const SessionScreen = () => {
  const [loadedModels, setLoadedModels] = useState<Record<ModelKey, boolean>>({
    ddqn: false,
    tcn: false,
    scaler: false,
  });
  const [isScanning, setIsScanning] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [sampleCount, setSampleCount] = React.useState(0);

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
    setElapsed(0);
    setSampleCount(0);
    setIsScanning(true);
    sileo.success({
      title: "Scanning started",
      description: "Live EEG signal acquisition is active.",
    });
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    sileo.info({
      title: "Scanning stopped",
      description: "Signal acquisition has been paused.",
    });
  };

  const handleExport = async () => {
    try {
      const path = await save({
        filters: [{ name: "CSV Data", extensions: ["csv"] }],
        defaultPath: `session_${Date.now()}.csv`,
      });
      if (!path) return;
      sileo.success({
        title: "Data exported",
        description: `Saved to ${(path as string).split(/[\\/]/).pop()}`,
      });
    } catch {
      sileo.error({
        title: "Export failed",
        description: "An error occurred while saving the file.",
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
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
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 transition-colors duration-500",
                isScanning
                  ? "border-(--chart-2)/40 bg-(--chart-2)/10"
                  : "border-border/60 bg-muted/40",
              )}>
              <span className="relative flex h-1.5 w-1.5">
                {isScanning && (
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ backgroundColor: "var(--chart-2)" }}
                  />
                )}
                <span
                  className="relative inline-flex h-1.5 w-1.5 rounded-full transition-colors"
                  style={{
                    backgroundColor: isScanning
                      ? "var(--chart-2)"
                      : "var(--muted-foreground)",
                    opacity: isScanning ? 1 : 0.5,
                  }}
                />
              </span>
              <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
                {isScanning ? "Scanning" : "Idle"}
              </span>
            </div>
          </div>

          {/* Stat strip */}
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-3 gap-3 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6">
            {/* Session Time */}
            <Card className="border-l-2 border-l-chart-3 gap-2 py-3.5">
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
            <Card className="border-l-2 border-l-chart-5 gap-2 py-3.5">
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
                "border-l-2 gap-2 py-3.5 transition-colors duration-500",
                allLoaded ? "border-l-emerald-500" : "border-l-chart-1",
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
                    allLoaded ? "text-emerald-500" : "text-foreground",
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
            <ChartLineInteractive isRunning={isScanning} className="h-full" />

            {/* Right — Model management + session controls */}
            <div className="flex flex-col gap-3 h-full">
              {/* Model management card */}
              <Card className="border-l-2 border-l-chart-3 from-primary/5 to-card bg-linear-to-t shadow-xs gap-2 py-3.5 flex-1">
                <CardHeader className="px-4 pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-muted/70">
                        <IconUpload className="size-3.5 text-muted-foreground" />
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
                      onClick={handleLoadModel}>
                      Load Model
                    </LiquidButton>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 px-4 pb-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-0.5 bg-border/40 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          allLoaded ? "bg-emerald-500" : "bg-foreground/50",
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
                          ? "text-emerald-500"
                          : "text-muted-foreground/60",
                      )}>
                      {Object.values(loadedModels).filter(Boolean).length}/
                      {REQUIRED_MODELS.length}
                    </span>
                  </div>

                  {/* Model rows */}
                  <div className="flex flex-col gap-1.5">
                    {REQUIRED_MODELS.map((model) => (
                      <div
                        key={model.key}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-1 transition-all duration-300",
                          loadedModels[model.key]
                            ? "border-emerald-500/25 bg-emerald-500/4"
                            : "border-border/30 bg-muted/10",
                        )}>
                        <div
                          className={cn(
                            "size-2 rounded-full shrink-0 transition-all duration-500",
                            loadedModels[model.key]
                              ? "bg-emerald-500 shadow-[0_0_6px_var(--color-emerald-500)]"
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
                          <span className="text-[9px] font-semibold font-mono text-emerald-500/80 shrink-0 tracking-wider">
                            READY
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Session controls card */}
              <Card className="border-l-2 border-l-chart-2 from-primary/5 to-card bg-linear-to-t shadow-xs gap-2 py-3.5">
                <CardHeader className="px-4 pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold leading-tight">
                        Session Controls
                      </CardTitle>
                      <p className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">
                        Acquisition &amp; data export
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 rounded-full transition-colors duration-300",
                          isScanning
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-muted-foreground/30",
                        )}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-mono tracking-wider transition-colors",
                          isScanning
                            ? "text-emerald-500"
                            : "text-muted-foreground/50",
                        )}>
                        {isScanning ? "LIVE" : "IDLE"}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-1.5 px-4 pb-0">
                  <Button
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-2.5 cursor-pointer transition-all h-8",
                      allLoaded && !isScanning
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent"
                        : "",
                    )}
                    disabled={!allLoaded || isScanning}
                    onClick={handleStartScanning}>
                    <ChartSpline animateOnHover className="size-4" />
                    Start Scanning
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full justify-start gap-2.5 cursor-pointer h-8"
                    disabled={!isScanning}
                    onClick={handleStopScanning}>
                    <TimerOff animateOnHover className="size-4" />
                    Stop Scanning
                  </Button>
                  <div className="h-px bg-border/40 my-0.5" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start gap-2.5 cursor-pointer h-8"
                    onClick={handleExport}>
                    <Download animateOnHover className="size-4" />
                    Export Data
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionScreen;
