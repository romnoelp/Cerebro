import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";

const DashboardScreen = () => {
  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
      <div className="@container/main flex flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
          {/* Page header */}
          <div className="flex items-end justify-between px-4 lg:px-6">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl font-semibold tracking-tight">
                Dashboard
              </h1>
              <p className="text-xs text-muted-foreground tracking-wide">
                Brain activity overview &amp; signal metrics
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/50 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-foreground/70" />
              </span>
              <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
                Live
              </span>
            </div>
          </div>
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
