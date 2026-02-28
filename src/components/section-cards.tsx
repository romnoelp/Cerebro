import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type SessionSummary } from "@/types";

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

interface Props {
  sessions: SessionSummary[];
}

export function SectionCards({ sessions }: Props) {
  const last = sessions.at(-1);
  const prev = sessions.at(-2);

  const alphaValue = last ? last.meanAlpha.toFixed(1) : "—";
  const alphaDelta =
    last && prev ? pctChange(last.meanAlpha, prev.meanAlpha) : null;

  const signalValue = last ? last.signalQualityPct.toFixed(1) + "%" : "—";
  const signalDelta =
    last && prev
      ? pctChange(last.signalQualityPct, prev.signalQualityPct)
      : null;

  const totalValue = sessions.length > 0 ? String(sessions.length) : "0";

  const focusIndex =
    last && last.sampleCount > 0
      ? (last.focusedCount / last.sampleCount).toFixed(2)
      : "—";
  const prevFocusIndex =
    prev && prev.sampleCount > 0 ? prev.focusedCount / prev.sampleCount : null;
  const focusDelta =
    last && prevFocusIndex !== null
      ? pctChange(last.focusedCount / last.sampleCount, prevFocusIndex)
      : null;

  const trend = (delta: number | null) =>
    delta === null ? null : delta >= 0 ? "up" : "down";

  const fmtDelta = (delta: number | null) =>
    delta === null ? null : (delta >= 0 ? "+" : "") + delta.toFixed(1) + "%";

  return (
    <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Alpha Power */}
      <Card className="@container/card border border-border/50 bg-background/10 backdrop-blur-md py-3 gap-3">
        <CardHeader>
          <CardDescription>Alpha Power</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {alphaValue !== "—" ? `${alphaValue} μV²` : "—"}
          </CardTitle>
          <CardAction>
            {alphaDelta !== null && (
              <Badge
                variant="outline"
                className="gap-1 border-foreground/30 text-foreground/70">
                {trend(alphaDelta) === "up" ? (
                  <IconTrendingUp className="size-3" />
                ) : (
                  <IconTrendingDown className="size-3" />
                )}
                {fmtDelta(alphaDelta)}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {sessions.length === 0
              ? "No sessions recorded yet"
              : alphaDelta !== null && alphaDelta >= 0
                ? "Elevated focus state"
                : "Decreased alpha activity"}
          </div>
          <div className="text-muted-foreground text-xs">
            {last
              ? `Last session · ${last.subjectName}`
              : "Export a session to populate"}
          </div>
        </CardFooter>
      </Card>

      {/* Signal Quality */}
      <Card className="@container/card border border-border/50 bg-background/10 backdrop-blur-md py-3 gap-3">
        <CardHeader>
          <CardDescription>Signal Quality</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {signalValue}
          </CardTitle>
          <CardAction>
            {signalDelta !== null && (
              <Badge
                variant="outline"
                className="gap-1 border-foreground/30 text-foreground/70">
                {trend(signalDelta) === "up" ? (
                  <IconTrendingUp className="size-3" />
                ) : (
                  <IconTrendingDown className="size-3" />
                )}
                {fmtDelta(signalDelta)}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {sessions.length === 0
              ? "No sessions recorded yet"
              : last && last.signalQualityPct >= 90
                ? "Clean signal acquisition"
                : "Signal quality below threshold"}
          </div>
          <div className="text-muted-foreground text-xs">
            Impedance within acceptable range
          </div>
        </CardFooter>
      </Card>

      {/* Total Sessions */}
      <Card className="@container/card border border-border/50 bg-background/10 backdrop-blur-md py-3 gap-3">
        <CardHeader>
          <CardDescription>Total Sessions</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {totalValue}
          </CardTitle>
          <CardAction>
            {sessions.length > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-foreground/30 text-foreground/70">
                <IconTrendingUp className="size-3" />
                +1
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {sessions.length === 0
              ? "No sessions recorded yet"
              : "Consistent recording activity"}
          </div>
          <div className="text-muted-foreground text-xs">
            {sessions.length > 0
              ? `${mean(sessions.map((s) => s.durationSecs / 60)).toFixed(1)} min avg duration`
              : "Export a session to populate"}
          </div>
        </CardFooter>
      </Card>

      {/* Focus Index */}
      <Card className="@container/card border border-border/50 bg-background/10 backdrop-blur-md py-3 gap-3">
        <CardHeader>
          <CardDescription>Focus Index</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {focusIndex}
          </CardTitle>
          <CardAction>
            {focusDelta !== null && (
              <Badge
                variant="outline"
                className="gap-1 border-foreground/30 text-foreground/50">
                {trend(focusDelta) === "up" ? (
                  <IconTrendingUp className="size-3" />
                ) : (
                  <IconTrendingDown className="size-3" />
                )}
                {fmtDelta(focusDelta)}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {sessions.length === 0
              ? "No sessions recorded yet"
              : focusDelta !== null && focusDelta >= 0
                ? "Improved focus this session"
                : "Slight decrease detected"}
          </div>
          <div className="text-muted-foreground text-xs">
            Focused / total samples ratio
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
