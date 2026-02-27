import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WINDOW = 30;
const TICK_MS = 400;

type DataPoint = { second: number; alpha: number; theta: number };

function generateSeed(): DataPoint[] {
  const data: DataPoint[] = [];
  let a = 55,
    t = 28;
  for (let i = 0; i < WINDOW + 1; i++) {
    a = Math.max(10, Math.min(90, a + (Math.random() - 0.48) * 15));
    t = Math.max(8, Math.min(50, t + (Math.random() - 0.52) * 10));
    data.push({ second: i, alpha: Math.round(a), theta: Math.round(t) });
  }
  return data;
}

const chartConfig = {
  bands: { label: "Band Power (μV²)" },
  alpha: { label: "Alpha (8–13 Hz)", color: "var(--chart-1)" },
  theta: { label: "Theta (4–8 Hz)", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ChartLineInteractive({
  isRunning = false,
  shouldReset = false,
  hasStarted = false,
  className,
}: {
  isRunning?: boolean;
  shouldReset?: boolean;
  hasStarted?: boolean;
  className?: string;
}) {
  const [activeChart, setActiveChart] = React.useState<"alpha" | "theta">(
    "alpha",
  );
  const [displayData, setDisplayData] = React.useState<DataPoint[]>(() => [
    { second: 0, alpha: 0, theta: 0 },
  ]);
  const counterRef = React.useRef(0);

  // Reset chart data when shouldReset is true
  React.useEffect(() => {
    if (shouldReset) {
      // Reset to empty state when session is cleared
      if (!hasStarted) {
        setDisplayData([{ second: 0, alpha: 0, theta: 0 }]);
        counterRef.current = 0;
      } else {
        // Reset with new seed data when starting fresh session
        const newData = generateSeed();
        setDisplayData(newData);
        counterRef.current = WINDOW + 1;
      }
    }
  }, [shouldReset, hasStarted]);

  // Initialize with real data when session starts
  React.useEffect(() => {
    if (hasStarted && displayData.length === 1 && displayData[0].second === 0) {
      const newData = generateSeed();
      setDisplayData(newData);
      counterRef.current = WINDOW + 1;
    }
  }, [hasStarted]);

  React.useEffect(() => {
    if (!isRunning) {
      return;
    }
    const id = setInterval(() => {
      counterRef.current += 1;
      const tick = counterRef.current;
      setDisplayData((prev) => {
        const last = prev[prev.length - 1];
        const na = Math.max(
          10,
          Math.min(90, last.alpha + (Math.random() - 0.48) * 15),
        );
        const nt = Math.max(
          8,
          Math.min(50, last.theta + (Math.random() - 0.52) * 10),
        );
        return [
          ...prev.slice(1),
          { second: tick, alpha: Math.round(na), theta: Math.round(nt) },
        ];
      });
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [isRunning]);

  // Focus index: rolling avg of alpha/theta ratio over last 5 points
  // Threshold mirrors the notebook's sigmoid >= 0.5 decision boundary:
  // ratio >= 0.5 → Focused (1), ratio < 0.5 → Unfocused (0)
  const focusRatio = React.useMemo(() => {
    const slice = displayData.slice(-5);
    const avg =
      slice.reduce((s, d) => s + d.alpha / Math.max(d.theta, 1), 0) /
      slice.length;
    return avg;
  }, [displayData]);

  const FOCUS_THRESHOLD = 0.5; // matches notebook: sigmoid >= 0.5 → Focused
  const focusState = focusRatio >= FOCUS_THRESHOLD ? "focused" : "unfocused";
  const focusLabel = focusState === "focused" ? "Focused" : "Unfocused";
  // clamp ratio to 0–1 range for bar fill (threshold sits at 50%)
  const focusBarPct = Math.min(
    100,
    Math.round((focusRatio / (FOCUS_THRESHOLD * 2)) * 100),
  );

  return (
    <Card
      className={cn(
        "flex flex-col border border-border/40 bg-background/20 backdrop-blur-sm",
        className,
      )}>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 px-0.5">
          <CardTitle>Live EEG Signal</CardTitle>
          <CardDescription>
            Band power (μV²) — rolling {WINDOW}s window
          </CardDescription>
        </div>
        <Select
          value={activeChart}
          onValueChange={(value) => setActiveChart(value as "alpha" | "theta")}>
          <SelectTrigger
            className="w-40 rounded-lg sm:ml-auto"
            aria-label="Select band">
            <SelectValue placeholder="Select band" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="alpha" className="rounded-lg">
              Alpha (8–13 Hz)
            </SelectItem>
            <SelectItem value="theta" className="rounded-lg">
              Theta (4–8 Hz)
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-62.5 w-full">
          <LineChart
            data={displayData}
            margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="second"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(v) => `${v}s`}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="w-40"
                  nameKey="bands"
                  labelFormatter={(v) => `${v}s`}
                  indicator="dot"
                />
              }
            />
            <Line
              dataKey={activeChart}
              type="monotone"
              stroke={`var(--color-${activeChart})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      {/* Brain State indicator footer */}
      <div className="border-t px-5 py-1 flex items-center gap-3 shrink-0 bg-muted/20">
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="size-1.5 rounded-full shrink-0 transition-colors duration-500"
            style={{
              backgroundColor: isRunning
                ? focusState === "focused"
                  ? "var(--chart-2)"
                  : "var(--chart-1)"
                : "var(--muted-foreground)",
              opacity: isRunning ? 1 : 0.4,
            }}
          />
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
            Brain State
          </span>
        </div>
        <div className="flex-1 h-1 bg-muted/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: isRunning ? `${focusBarPct}%` : "0%",
              backgroundColor:
                focusState === "focused" ? "var(--chart-2)" : "var(--chart-1)",
            }}
          />
        </div>
        <span
          className="text-[10px] font-semibold font-mono tracking-wider shrink-0 transition-colors min-w-15 text-right"
          style={{
            color: isRunning
              ? focusState === "focused"
                ? "var(--chart-2)"
                : "var(--chart-1)"
              : "var(--muted-foreground)",
            opacity: isRunning ? 1 : 0.4,
          }}>
          {isRunning ? focusLabel.toUpperCase() : "IDLE"}
        </span>
      </div>
    </Card>
  );
}
