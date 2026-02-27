import { motion, AnimatePresence } from "motion/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import neuralNetwork from "@/assets/neuralNetwork.svg";
import { cn } from "@/lib/utils";
import { calibrationSteps, ease } from "../constants";

interface CalibrationDialogProps {
  open: boolean;
  calibrationStep: number;
  showStartButton: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export const CalibrationDialog = ({
  open,
  calibrationStep,
  showStartButton,
  onOpenChange,
  onComplete,
  onCancel,
}: CalibrationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-8 pt-12 pb-6">
          {/* Neural Network Icon with rotating rings */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute rounded-full border border-dashed border-foreground/15"
                style={{ width: 108, height: 108 }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 9,
                  ease: "linear",
                  repeat: Infinity,
                }}
              />
              <motion.div
                className="absolute rounded-full border border-foreground/[0.07]"
                style={{ width: 140, height: 140 }}
                animate={{ rotate: -360 }}
                transition={{
                  duration: 14,
                  ease: "linear",
                  repeat: Infinity,
                }}
              />
              <img
                src={neuralNetwork}
                alt="Neural Network"
                className="relative z-10 w-14 h-14 dark:invert opacity-60"
              />
            </div>
            <span className="text-[10px] font-mono font-semibold tracking-[0.3em] uppercase text-muted-foreground/60">
              Calibrating
            </span>
          </div>

          {/* Instructions */}
          <div className="flex flex-col gap-3 text-center">
            <h3 className="text-sm font-semibold">Participant Calibration</h3>
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <p>Please ensure the participant is:</p>
              <ul className="flex flex-col gap-1 list-none">
                <li>• Seated comfortably</li>
                <li>• Avoiding sudden movements</li>
                <li>• Breathing normally and steadily</li>
                <li>• Relaxed and focused</li>
              </ul>
            </div>
          </div>

          {/* Calibration steps */}
          <div className="flex flex-col gap-2 w-full font-mono">
            {calibrationSteps.map((step, i) => {
              if (i > calibrationStep) return null;
              const isDone = i < calibrationStep;
              const isCurrent = i === calibrationStep;
              return (
                <motion.div
                  key={i}
                  className="flex items-center gap-2.5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.3, ease: ease },
                  }}>
                  <span
                    className={cn(
                      "text-xs shrink-0 w-3",
                      isDone ? "text-foreground/30" : "text-muted-foreground",
                    )}>
                    {isDone ? "✓" : "›"}
                  </span>
                  <span
                    className={cn(
                      "text-xs tracking-wide",
                      isDone
                        ? "text-muted-foreground/35"
                        : "text-muted-foreground",
                    )}>
                    {step}
                  </span>
                  {isCurrent && (
                    <motion.span
                      className="ml-0.5 inline-block w-1.25 h-3.25 bg-foreground/50 shrink-0"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{
                        duration: 0.75,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Cancel button - always visible during calibration */}
          {!showStartButton && (
            <Button onClick={onCancel} variant="outline" className="w-full">
              Cancel Session
            </Button>
          )}

          {/* Start button - appears after calibration */}
          <AnimatePresence>
            {showStartButton && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: ease },
                }}
                className="w-full flex flex-col gap-2">
                <Button
                  onClick={onComplete}
                  className="w-full bg-foreground text-background hover:bg-foreground/90">
                  Begin Acquisition
                </Button>
                <Button onClick={onCancel} variant="outline" className="w-full">
                  Cancel
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
