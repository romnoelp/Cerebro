import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const description = "EEG band power over time";

const chartData = [
  { date: "2024-04-01", alpha: 42, theta: 28 },
  { date: "2024-04-02", alpha: 35, theta: 31 },
  { date: "2024-04-03", alpha: 50, theta: 24 },
  { date: "2024-04-04", alpha: 38, theta: 33 },
  { date: "2024-04-05", alpha: 61, theta: 20 },
  { date: "2024-04-06", alpha: 55, theta: 26 },
  { date: "2024-04-07", alpha: 44, theta: 30 },
  { date: "2024-04-08", alpha: 70, theta: 18 },
  { date: "2024-04-09", alpha: 29, theta: 38 },
  { date: "2024-04-10", alpha: 47, theta: 27 },
  { date: "2024-04-11", alpha: 58, theta: 22 },
  { date: "2024-04-12", alpha: 40, theta: 29 },
  { date: "2024-04-13", alpha: 63, theta: 19 },
  { date: "2024-04-14", alpha: 33, theta: 36 },
  { date: "2024-04-15", alpha: 27, theta: 40 },
  { date: "2024-04-16", alpha: 34, theta: 34 },
  { date: "2024-04-17", alpha: 75, theta: 15 },
  { date: "2024-04-18", alpha: 66, theta: 21 },
  { date: "2024-04-19", alpha: 45, theta: 28 },
  { date: "2024-04-20", alpha: 22, theta: 42 },
  { date: "2024-04-21", alpha: 31, theta: 37 },
  { date: "2024-04-22", alpha: 48, theta: 26 },
  { date: "2024-04-23", alpha: 36, theta: 32 },
  { date: "2024-04-24", alpha: 67, theta: 18 },
  { date: "2024-04-25", alpha: 43, theta: 29 },
  { date: "2024-04-26", alpha: 20, theta: 44 },
  { date: "2024-04-27", alpha: 71, theta: 16 },
  { date: "2024-04-28", alpha: 30, theta: 38 },
  { date: "2024-04-29", alpha: 54, theta: 23 },
  { date: "2024-04-30", alpha: 77, theta: 14 },
  { date: "2024-05-01", alpha: 37, theta: 33 },
  { date: "2024-05-02", alpha: 52, theta: 25 },
  { date: "2024-05-03", alpha: 46, theta: 27 },
  { date: "2024-05-04", alpha: 68, theta: 19 },
  { date: "2024-05-05", alpha: 80, theta: 12 },
  { date: "2024-05-06", alpha: 74, theta: 16 },
  { date: "2024-05-07", alpha: 62, theta: 21 },
  { date: "2024-05-08", alpha: 28, theta: 39 },
  { date: "2024-05-09", alpha: 41, theta: 30 },
  { date: "2024-05-10", alpha: 53, theta: 24 },
  { date: "2024-05-11", alpha: 59, theta: 22 },
  { date: "2024-05-12", alpha: 39, theta: 31 },
  { date: "2024-05-13", alpha: 35, theta: 35 },
  { date: "2024-05-14", alpha: 73, theta: 17 },
  { date: "2024-05-15", alpha: 78, theta: 13 },
  { date: "2024-05-16", alpha: 60, theta: 22 },
  { date: "2024-05-17", alpha: 76, theta: 15 },
  { date: "2024-05-18", alpha: 55, theta: 24 },
  { date: "2024-05-19", alpha: 44, theta: 29 },
  { date: "2024-05-20", alpha: 32, theta: 37 },
  { date: "2024-05-21", alpha: 21, theta: 43 },
  { date: "2024-05-22", alpha: 19, theta: 45 },
  { date: "2024-05-23", alpha: 49, theta: 26 },
  { date: "2024-05-24", alpha: 51, theta: 25 },
  { date: "2024-05-25", alpha: 38, theta: 32 },
  { date: "2024-05-26", alpha: 36, theta: 33 },
  { date: "2024-05-27", alpha: 72, theta: 16 },
  { date: "2024-05-28", alpha: 43, theta: 28 },
  { date: "2024-05-29", alpha: 18, theta: 46 },
  { date: "2024-05-30", alpha: 57, theta: 23 },
  { date: "2024-05-31", alpha: 33, theta: 36 },
  { date: "2024-06-01", alpha: 34, theta: 35 },
  { date: "2024-06-02", alpha: 79, theta: 13 },
  { date: "2024-06-03", alpha: 26, theta: 41 },
  { date: "2024-06-04", alpha: 69, theta: 18 },
  { date: "2024-06-05", alpha: 23, theta: 43 },
  { date: "2024-06-06", alpha: 50, theta: 25 },
  { date: "2024-06-07", alpha: 56, theta: 23 },
  { date: "2024-06-08", alpha: 64, theta: 20 },
  { date: "2024-06-09", alpha: 74, theta: 15 },
  { date: "2024-06-10", alpha: 30, theta: 38 },
  { date: "2024-06-11", alpha: 24, theta: 42 },
  { date: "2024-06-12", alpha: 82, theta: 11 },
  { date: "2024-06-13", alpha: 20, theta: 44 },
  { date: "2024-06-14", alpha: 71, theta: 17 },
  { date: "2024-06-15", alpha: 53, theta: 24 },
  { date: "2024-06-16", alpha: 61, theta: 21 },
  { date: "2024-06-17", alpha: 77, theta: 14 },
  { date: "2024-06-18", alpha: 25, theta: 41 },
  { date: "2024-06-19", alpha: 58, theta: 22 },
  { date: "2024-06-20", alpha: 66, theta: 19 },
  { date: "2024-06-21", alpha: 31, theta: 37 },
  { date: "2024-06-22", alpha: 54, theta: 24 },
  { date: "2024-06-23", alpha: 80, theta: 12 },
  { date: "2024-06-24", alpha: 28, theta: 39 },
  { date: "2024-06-25", alpha: 29, theta: 38 },
  { date: "2024-06-26", alpha: 70, theta: 17 },
  { date: "2024-06-27", alpha: 75, theta: 14 },
  { date: "2024-06-28", alpha: 32, theta: 36 },
  { date: "2024-06-29", alpha: 27, theta: 40 },
  { date: "2024-06-30", alpha: 73, theta: 16 },
];

const chartConfig = {
  eeg: {
    label: "EEG Power",
  },
  alpha: {
    label: "Alpha (8–13 Hz)",
    color: "var(--chart-1)",
  },
  theta: {
    label: "Theta (4–8 Hz)",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date);
    const referenceDate = new Date("2024-06-30");
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return date >= startDate;
  });

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>EEG Band Power</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Alpha &amp; Theta power (μV²) over the last 3 months
          </span>
          <span className="@[540px]/card:hidden">Alpha &amp; Theta power</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex">
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value">
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-62.5 w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillAlpha" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-alpha)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-alpha)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillTheta" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-theta)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-theta)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="theta"
              type="natural"
              fill="url(#fillTheta)"
              stroke="var(--color-theta)"
              stackId="a"
            />
            <Area
              dataKey="alpha"
              type="natural"
              fill="url(#fillAlpha)"
              stroke="var(--color-alpha)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
