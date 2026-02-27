import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  isActive: boolean;
  highlight?: boolean;
}

export const StatCard = ({
  icon,
  label,
  value,
  isActive,
  highlight = false,
}: StatCardProps) => {
  return (
    <Card
      className={cn(
        "gap-1.5 py-2 transition-colors duration-500 backdrop-blur-md",
        highlight
          ? "border border-foreground/50 bg-foreground/5"
          : "border border-border/50 bg-background/10",
      )}>
      <CardHeader className="px-4 pb-0 gap-1.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-[10px] uppercase tracking-widest font-medium">
            {label}
          </span>
        </div>
        <CardTitle
          className={cn(
            "text-lg font-bold tabular-nums font-mono transition-colors",
            isActive ? "text-foreground" : "text-muted-foreground/50",
          )}>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
};
