import * as React from "react";
import { motion } from "motion/react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { cn } from "@/lib/utils";
import { type EegBandPowers as TgcBandData } from "@/domain";

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

const WINDOW = 30;

// All 8 ThinkGear bands — keys match ThinkGear Connector JSON exactly
const BANDS = [
  {
    key: "delta",
    label: "δ Delta",
    range: "0.5–2.75 Hz",
    color: "var(--chart-1)",
  },
  {
    key: "theta",
    label: "θ Theta",
    range: "3.5–6.75 Hz",
    color: "var(--chart-2)",
  },
  {
    key: "lowAlpha",
    label: "α Low",
    range: "7.5–9.25 Hz",
    color: "var(--chart-3)",
  },
  {
    key: "highAlpha",
    label: "α High",
    range: "10–11.75 Hz",
    color: "var(--chart-4)",
  },
  {
    key: "lowBeta",
    label: "β Low",
    range: "13–16.75 Hz",
    color: "var(--chart-5)",
  },
  {
    key: "highBeta",
    label: "β High",
    range: "18–29.75 Hz",
    color: "hsl(280 65% 60%)",
  },
  {
    key: "lowGamma",
    label: "γ Low",
    range: "31–39.75 Hz",
    color: "hsl(180 55% 50%)",
  },
  {
    key: "midGamma",
    label: "γ Mid",
    range: "41–49.75 Hz",
    color: "hsl(40 80% 55%)",
  },
] as const;

type BandKey = (typeof BANDS)[number]["key"];
type DataPoint = { second: number } & Record<BandKey, number>;

const EMPTY_POINT: DataPoint = {
  second: 0,
  delta: 0,
  theta: 0,
  lowAlpha: 0,
  highAlpha: 0,
  lowBeta: 0,
  highBeta: 0,
  lowGamma: 0,
  midGamma: 0,
};

const FOCUS_BAR_COLORS = {
  focused: "hsl(142 72% 42%)",
  unfocused: "hsl(212 92% 52%)",
} as const;

const clamp = (value: number, low: number, high: number) => {
  return Math.max(low, Math.min(high, value));
};

const chartConfig = {
  bands: { label: "Band Power (μV²)" },
  ...Object.fromEntries(
    BANDS.map((b) => [
      b.key,
      { label: `${b.label} (${b.range})`, color: b.color },
    ]),
  ),
} satisfies ChartConfig;

export function ChartLineInteractive({
  isRunning = false,
  shouldReset = false,
  liveData,
  modelFocusState,
  modelFocusLevel,
  className,
}: {
  isRunning?: boolean;
  shouldReset?: boolean;
  /** Live band power packet from the headset. When provided, real data drives
   *  the chart. */
  liveData?: TgcBandData;
  /** Rolling majority-vote result from the ONNX model (last 5 packets).
   *  When provided this overrides the local β/θ heuristic so the chart
   *  label matches what is written to the CSV. undefined = window not yet
   *  full, fall back to heuristic. */
  modelFocusState?: "focused" | "unfocused";
  /** Rolling focus level from the model window (0..100). */
  modelFocusLevel?: number;
  className?: string;
}) {
  // Which bands are toggled visible — all on by default
  const [visibleBands, setVisibleBands] = React.useState<Set<BandKey>>(
    () => new Set(BANDS.map((b) => b.key)),
  );

  const [displayData, setDisplayData] = React.useState<DataPoint[]>(() =>
    Array.from({ length: WINDOW + 1 }, (_, i) => ({
      ...EMPTY_POINT,
      second: i,
    })),
  );
  const counterRef = React.useRef(WINDOW + 1);

  const toggleBand = (key: BandKey) => {
    setVisibleBands((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // always keep at least one visible
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Flat window used when the chart is waiting for real data.
  const emptyWindow = React.useMemo(
    () =>
      Array.from({ length: WINDOW + 1 }, (_, i) => ({
        ...EMPTY_POINT,
        second: i,
      })),
    [],
  );

  // Reset chart data when shouldReset is true
  React.useEffect(() => {
    if (shouldReset) {
      setDisplayData(emptyWindow);
      counterRef.current = WINDOW + 1;
    }
  }, [shouldReset, emptyWindow]);

  // Real-data push — fires whenever a new TGC packet arrives.
  React.useEffect(() => {
    if (!isRunning || liveData === undefined) return;
    counterRef.current += 1;
    const tick = counterRef.current;
    setDisplayData((prev) => [
      ...prev.slice(1),
      { second: tick, ...(liveData as Record<BandKey, number>) } as DataPoint,
    ]);
  }, [liveData, isRunning]);

  const resolvedFocusLevel = clamp(modelFocusLevel ?? 0, 0, 100);

  // Focus state comes from the model's rolling vote in live mode.
  // undefined means the model window is not yet full.
  const focusState: "focused" | "unfocused" | "waiting" =
    modelFocusState ?? "waiting";
  const focusLabel =
    focusState === "focused"
      ? `FOCUSED ${Math.round(resolvedFocusLevel)}%`
      : focusState === "unfocused"
        ? `UNFOCUSED ${Math.round(resolvedFocusLevel)}%`
        : "WAITING...";
  const focusBarPct = resolvedFocusLevel;
  const focusBarColor =
    focusState === "focused"
      ? FOCUS_BAR_COLORS.focused
      : focusState === "unfocused"
        ? FOCUS_BAR_COLORS.unfocused
        : "var(--muted-foreground)";

  return (
    <Card
      className={cn(
        "flex flex-col border border-border/50 bg-background/10 backdrop-blur-md",
        className,
      )}>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-3 sm:flex-row">
        <div className="grid flex-1 gap-1 px-0.5">
          <CardTitle>Live EEG Signal</CardTitle>
          <CardDescription>
            Band power (μV²) — rolling {WINDOW}s window
          </CardDescription>
        </div>
        {/* Band toggle pills */}
        <div className="flex flex-wrap gap-1 sm:ml-auto">
          {BANDS.map((b) => {
            const active = visibleBands.has(b.key);
            return (
              <button
                key={b.key}
                onClick={() => toggleBand(b.key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity border",
                  active ? "opacity-100" : "opacity-30",
                )}
                style={{
                  borderColor: b.color,
                  color: b.color,
                  backgroundColor: active
                    ? `color-mix(in srgb, ${b.color} 12%, transparent)`
                    : "transparent",
                }}>
                <span
                  className="size-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: b.color }}
                />
                {b.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0 relative">
        <ChartContainer config={chartConfig} className="flex-1 min-h-0 w-full">
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
                  className="w-48"
                  nameKey="bands"
                  labelFormatter={(v) => `${v}s`}
                  indicator="dot"
                />
              }
            />
            {BANDS.map((b) =>
              visibleBands.has(b.key) ? (
                <Line
                  key={b.key}
                  dataKey={b.key}
                  name={`${b.label} (${b.range})`}
                  type="monotone"
                  stroke={b.color}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null,
            )}
          </LineChart>
        </ChartContainer>
      </CardContent>
      {/* Brain State indicator footer */}
      <div className="border-t px-5 py-0.5 flex items-center gap-3 shrink-0 bg-muted/20">
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="size-1.5 rounded-full shrink-0 transition-colors duration-500"
            style={{
              backgroundColor:
                !isRunning || focusState === "waiting"
                  ? "var(--muted-foreground)"
                  : focusState === "focused"
                    ? "var(--chart-2)"
                    : "var(--chart-1)",
              opacity: !isRunning || focusState === "waiting" ? 0.4 : 1,
            }}
          />
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
            Brain State
          </span>
        </div>
        <div className="relative flex-1 h-1 bg-muted/50 rounded-full overflow-hidden">
          {isRunning && focusState === "waiting" ? (
            <motion.div
              className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-muted-foreground/35"
              initial={{ x: "-120%", opacity: 0.4 }}
              animate={{ x: ["-120%", "180%"], opacity: [0.35, 0.75, 0.35] }}
              transition={{
                repeat: Infinity,
                duration: 1.15,
                ease: "linear",
              }}
            />
          ) : (
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: isRunning ? `${focusBarPct}%` : "0%",
                backgroundColor: focusBarColor,
              }}
            />
          )}
        </div>
        <span
          className="text-[10px] font-semibold font-mono tracking-wider shrink-0 transition-colors min-w-15 text-right"
          style={{
            color:
              !isRunning || focusState === "waiting"
                ? "var(--muted-foreground)"
                : focusState === "focused"
                  ? "var(--chart-2)"
                  : "var(--chart-1)",
            opacity: !isRunning || focusState === "waiting" ? 0.4 : 1,
          }}>
          {isRunning ? focusLabel : "IDLE"}
        </span>
      </div>
    </Card>
  );
}
