import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartSpline } from "@/components/animate-ui/icons/chart-spline";
import { TimerOff } from "@/components/animate-ui/icons/timer-off";
import { Download } from "@/components/animate-ui/icons/download";
import { cn } from "@/lib/utils";

interface SessionControlsCardProps {
  isScanning: boolean;
  hasStarted: boolean;
  allLoaded: boolean;
  onStartScanning: () => void;
  onStopScanning: () => void;
  onExport: () => void;
  // EEG source selection
  esp32Port: string;
  onEsp32PortChange: (port: string) => void;
  availablePorts: string[];
  onRefreshPorts: () => void;
}

export const SessionControlsCard = ({
  isScanning,
  hasStarted,
  allLoaded,
  onStartScanning,
  onStopScanning,
  onExport,
  esp32Port,
  onEsp32PortChange,
  availablePorts,
  onRefreshPorts,
}: SessionControlsCardProps) => {
  const canChangeSource = !isScanning && !hasStarted;

  return (
    <Card className="border border-border/50 bg-background/10 backdrop-blur-md gap-2 py-3.5">
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
                isScanning ? "text-foreground/70" : "text-muted-foreground/50",
              )}>
              {isScanning ? "LIVE" : "IDLE"}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 px-4 pb-0">
        {/* ── Source selector ──────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-widest px-0.5">
            Source
          </span>
          {/* COM port picker */}
          <div className="flex gap-1">
            <Select
              value={esp32Port}
              onValueChange={onEsp32PortChange}
              disabled={!canChangeSource || availablePorts.length === 0}>
              <SelectTrigger className="h-7 text-[11px] flex-1 border-border/40 bg-background/20">
                <SelectValue
                  placeholder={
                    availablePorts.length === 0
                      ? "No ports found"
                      : "Select COM port"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availablePorts.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={onRefreshPorts}
              disabled={!canChangeSource}
              title="Refresh port list"
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md border border-border/40 bg-background/20 text-[10px] text-muted-foreground/70 transition-all hover:bg-foreground/10",
                !canChangeSource && "opacity-40 cursor-not-allowed",
              )}>
              ↻
            </button>
          </div>
        </div>

        <div className="h-px bg-border/40 my-0.5" />

        {/* ── Session action rows ─────────────────────────────────── */}
        <div
          onClick={() => (!allLoaded || isScanning ? null : onStartScanning())}
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

        <div
          onClick={() => (!isScanning ? null : onStopScanning())}
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
            <span className="text-xs font-medium">Pause Scanning</span>
            <span className="text-[10px] text-muted-foreground/60">
              Temporarily halt acquisition
            </span>
          </div>
        </div>

        <div className="h-px bg-border/40 my-0.5" />

        <div
          onClick={() => (isScanning || !hasStarted ? null : onExport())}
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
  );
};
