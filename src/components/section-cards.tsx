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

export function SectionCards() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card border-l-2 border-l-[var(--chart-1)] py-4 gap-4">
        <CardHeader>
          <CardDescription>Alpha Power</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            38.4 μV²
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="gap-1 border-[var(--chart-1)]/30 text-[var(--chart-1)]">
              <IconTrendingUp className="size-3" />
              +8.2%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Elevated focus state <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground text-xs">
            Average over the last session
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card border-l-2 border-l-[var(--chart-2)] py-4 gap-4">
        <CardHeader>
          <CardDescription>Signal Quality</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            94.2%
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="gap-1 border-[var(--chart-2)]/30 text-[var(--chart-2)]">
              <IconTrendingUp className="size-3" />
              +2.1%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Clean signal acquisition <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground text-xs">
            Impedance within acceptable range
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card border-l-2 border-l-[var(--chart-3)] py-4 gap-4">
        <CardHeader>
          <CardDescription>Total Sessions</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            128
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="gap-1 border-[var(--chart-3)]/30 text-[var(--chart-3)]">
              <IconTrendingUp className="size-3" />
              +15.4%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Consistent recording activity <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground text-xs">
            Across all subjects this month
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card border-l-2 border-l-[var(--chart-5)] py-4 gap-4">
        <CardHeader>
          <CardDescription>Focus Index</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            0.76
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="gap-1 border-destructive/30 text-destructive">
              <IconTrendingDown className="size-3" />
              -3.1%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Slight decrease detected <IconTrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground text-xs">
            Alpha/Theta ratio, last 7 days
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
