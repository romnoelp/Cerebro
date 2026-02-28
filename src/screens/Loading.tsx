import { motion } from "motion/react";
import neuralNetwork from "@/assets/neuralNetwork.svg";
import { Progress } from "@/components/animate-ui/components/radix/progress";
import { cn } from "@/lib/utils";
import { LOADING_STEPS } from "./intro/constants";
import { EASE } from "@/lib/constants";

interface LoadingScreenProps {
  stepIndex: number;
}

export const LoadingScreen = ({ stepIndex }: LoadingScreenProps) => {
  const progress = Math.round(((stepIndex + 1) / LOADING_STEPS.length) * 100);

  return (
    <motion.div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-y-12"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: { duration: 0.55, ease: EASE },
      }}
      exit={{
        opacity: 0,
        scale: 0.97,
        transition: { duration: 0.4, ease: EASE },
      }}>
      <div className="flex flex-col items-center gap-y-4">
        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute rounded-full border border-dashed border-foreground/15"
            style={{ width: 108, height: 108 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 9, ease: "linear", repeat: Infinity }}
          />
          <motion.div
            className="absolute rounded-full border border-foreground/[0.07]"
            style={{ width: 140, height: 140 }}
            animate={{ rotate: -360 }}
            transition={{ duration: 14, ease: "linear", repeat: Infinity }}
          />
          <img
            src={neuralNetwork}
            alt="Neural Network"
            className="relative z-10 w-14 h-14 dark:invert opacity-60"
          />
        </div>
        <span className="text-[10px] font-mono font-semibold tracking-[0.3em] uppercase text-muted-foreground/60">
          Cerebro
        </span>
      </div>

      <div className="flex flex-col gap-y-2 w-72 font-mono">
        {LOADING_STEPS.map((step, i) => {
          if (i > stepIndex) return null;
          const isDone = i < stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <motion.div
              key={i}
              className="flex items-center gap-x-2.5"
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: { duration: 0.3, ease: EASE },
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
                  isDone ? "text-muted-foreground/35" : "text-muted-foreground",
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

      <div className="flex flex-col gap-y-3 w-72">
        <Progress value={progress} className="h-0.5 w-full bg-border/40" />
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-mono font-medium tracking-[0.25em] uppercase text-muted-foreground/40">
            Initializing
          </span>
          <span className="text-[9px] font-mono tabular-nums text-muted-foreground/40 tracking-wider">
            {progress}%
          </span>
        </div>
      </div>
    </motion.div>
  );
};
