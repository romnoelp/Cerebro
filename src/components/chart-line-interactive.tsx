import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { cn } from "@/lib/utils";
import { type TgcBandData } from "@/types";

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
const TICK_MS = 400;

// All 8 ThinkGear bands — keys match ThinkGear Connector JSON exactly
const BANDS = [
  {
    key: "delta",
    label: "δ Delta",
    range: "0.5–2.75 Hz",
    color: "var(--chart-1)",
    init: { lo: 45, hi: 70, drift: 0.49 },
  },
  {
    key: "theta",
    label: "θ Theta",
    range: "3.5–6.75 Hz",
    color: "var(--chart-2)",
    init: { lo: 15, hi: 35, drift: 0.5 },
  },
  {
    key: "lowAlpha",
    label: "α Low",
    range: "7.5–9.25 Hz",
    color: "var(--chart-3)",
    init: { lo: 10, hi: 28, drift: 0.48 },
  },
  {
    key: "highAlpha",
    label: "α High",
    range: "10–11.75 Hz",
    color: "var(--chart-4)",
    init: { lo: 8, hi: 22, drift: 0.5 },
  },
  {
    key: "lowBeta",
    label: "β Low",
    range: "13–16.75 Hz",
    color: "var(--chart-5)",
    init: { lo: 5, hi: 20, drift: 0.5 },
  },
  {
    key: "highBeta",
    label: "β High",
    range: "18–29.75 Hz",
    color: "hsl(280 65% 60%)",
    init: { lo: 3, hi: 15, drift: 0.51 },
  },
  {
    key: "lowGamma",
    label: "γ Low",
    range: "31–39.75 Hz",
    color: "hsl(180 55% 50%)",
    init: { lo: 2, hi: 9, drift: 0.51 },
  },
  {
    key: "midGamma",
    label: "γ Mid",
    range: "41–49.75 Hz",
    color: "hsl(40 80% 55%)",
    init: { lo: 1, hi: 7, drift: 0.51 },
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

const clamp = (v: number, lo: number, hi: number) => {
  return Math.max(lo, Math.min(hi, v));
};

const generateSeed = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const state = Object.fromEntries(
    BANDS.map((b) => [b.key, (b.init.lo + b.init.hi) / 2]),
  ) as Record<BandKey, number>;
  for (let i = 0; i < WINDOW + 1; i++) {
    BANDS.forEach((b) => {
      state[b.key] = clamp(
        state[b.key] +
          (Math.random() - b.init.drift) * ((b.init.hi - b.init.lo) * 0.15),
        b.init.lo,
        b.init.hi,
      );
    });
    data.push({
      second: i,
      ...Object.fromEntries(
        BANDS.map((b) => [b.key, Math.round(state[b.key])]),
      ),
    } as DataPoint);
  }
  return data;
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
  hasStarted = false,
  liveData,
  className,
}: {
  isRunning?: boolean;
  shouldReset?: boolean;
  hasStarted?: boolean;
  /** Live band power packet from the headset. When provided the mock ticker
   *  is suppressed and real data drives the chart instead. */
  liveData?: TgcBandData;
  className?: string;
}) {
  // Which bands are toggled visible — all on by default
  const [visibleBands, setVisibleBands] = React.useState<Set<BandKey>>(
    () => new Set(BANDS.map((b) => b.key)),
  );

  const [displayData, setDisplayData] = React.useState<DataPoint[]>(() => [
    { ...EMPTY_POINT },
  ]);
  const counterRef = React.useRef(0);
  // Running state per band so each drifts continuously between ticks
  const stateRef = React.useRef<Record<BandKey, number>>(
    Object.fromEntries(
      BANDS.map((b) => [b.key, (b.init.lo + b.init.hi) / 2]),
    ) as Record<BandKey, number>,
  );

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

  // Reset chart data when shouldReset is true
  React.useEffect(() => {
    if (shouldReset) {
      // Reset to empty state when session is cleared
      if (!hasStarted) {
        setDisplayData([{ ...EMPTY_POINT }]);
        counterRef.current = 0;
      } else {
        // Reset with new seed data when starting fresh session
        const newData = generateSeed();
        setDisplayData(newData);
        counterRef.current = WINDOW + 1;
        const last = newData[newData.length - 1];
        BANDS.forEach((b) => {
          stateRef.current[b.key] = last[b.key];
        });
      }
    }
  }, [shouldReset, hasStarted]);

  // Initialize with real data when session starts
  React.useEffect(() => {
    if (hasStarted && displayData.length === 1 && displayData[0].second === 0) {
      const newData = generateSeed();
      setDisplayData(newData);
      counterRef.current = WINDOW + 1;
      const last = newData[newData.length - 1];
      BANDS.forEach((b) => {
        stateRef.current[b.key] = last[b.key];
      });
    }
  }, [hasStarted]);

  React.useEffect(() => {
    // Mock ticker — only runs when no live headset data is available.
    if (!isRunning || liveData !== undefined) {
      return;
    }
    const id = setInterval(() => {
      counterRef.current += 1;
      const tick = counterRef.current;
      setDisplayData((prev) => {
        BANDS.forEach((b) => {
          stateRef.current[b.key] = clamp(
            stateRef.current[b.key] +
              (Math.random() - b.init.drift) * ((b.init.hi - b.init.lo) * 0.15),
            b.init.lo,
            b.init.hi,
          );
        });
        const newPoint = {
          second: tick,
          ...Object.fromEntries(
            BANDS.map((b) => [b.key, Math.round(stateRef.current[b.key])]),
          ),
        } as DataPoint;
        return [...prev.slice(1), newPoint];
      });
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [isRunning, liveData]);

  // Real-data push — fires whenever a new TGC packet arrives.
  React.useEffect(() => {
    if (!isRunning || liveData === undefined) return;
    counterRef.current += 1;
    const tick = counterRef.current;
    // Update stateRef so mock ticker continues smoothly if headset disconnects.
    BANDS.forEach((b) => {
      stateRef.current[b.key] =
        (liveData as Record<string, number>)[b.key] ?? stateRef.current[b.key];
    });
    setDisplayData((prev) => [
      ...prev.slice(1),
      { second: tick, ...(liveData as Record<BandKey, number>) } as DataPoint,
    ]);
  }, [liveData, isRunning]);

  // Focus = beta/theta ratio — mirrors notebook feature[8]: combined_beta / theta
  // ratio >= 0.5 → Focused (1), ratio < 0.5 → Unfocused (0)
  const focusRatio = React.useMemo(() => {
    const slice = displayData.slice(-5);
    const avg =
      slice.reduce((s, d) => {
        const beta = (d.lowBeta + d.highBeta) / 2;
        return s + beta / Math.max(d.theta, 1);
      }, 0) / slice.length;
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
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-56 w-full">
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
