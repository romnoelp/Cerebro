import { IconUpload } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid";
import { cn } from "@/lib/utils";
import { requiredModels, ModelKey } from "../constants";

interface ModelManagementCardProps {
  loadedModels: Record<ModelKey, boolean>;
  allLoaded: boolean;
  onLoadModel: () => void;
}

export const ModelManagementCard = ({
  loadedModels,
  allLoaded,
  onLoadModel,
}: ModelManagementCardProps) => {
  return (
    <Card className="border border-border/50 bg-background/10 backdrop-blur-md gap-2 py-3.5 flex-1">
      <CardHeader className="px-4 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-foreground/5 border border-border/40">
              <IconUpload className="size-3.5 text-muted-foreground/70" />
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
            onClick={onLoadModel}
            disabled={allLoaded}>
            Load Model
          </LiquidButton>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4 pb-0 flex-1">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-0.5 bg-border/40 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                allLoaded ? "bg-foreground/80" : "bg-foreground/30",
              )}
              style={{
                width: `${(Object.values(loadedModels).filter(Boolean).length / requiredModels.length) * 100}%`,
              }}
            />
          </div>
          <span
            className={cn(
              "text-[10px] font-mono tabular-nums shrink-0 transition-colors",
              allLoaded ? "text-foreground/70" : "text-muted-foreground/60",
            )}>
            {Object.values(loadedModels).filter(Boolean).length}/
            {requiredModels.length}
          </span>
        </div>

        {/* Model rows */}
        <div className="flex flex-col gap-1.5 flex-1 justify-center">
          {requiredModels.map((model) => (
            <div
              key={model.key}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-1 transition-all duration-300",
                loadedModels[model.key]
                  ? "border-foreground/30 bg-foreground/5"
                  : "border-border/20 bg-foreground/2",
              )}>
              <div
                className={cn(
                  "size-2 rounded-full shrink-0 transition-all duration-500",
                  loadedModels[model.key]
                    ? "bg-foreground/70"
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
                <span className="text-[9px] font-semibold font-mono text-foreground/60 shrink-0 tracking-wider">
                  READY
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
