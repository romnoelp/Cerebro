import { motion } from "motion/react";
import neuralNetwork from "@/assets/neuralNetwork.svg";
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid";
import { EASE } from "@/lib/constants";

interface HomeScreenProps {
  onStart: () => void;
}

export const HomeScreen = ({ onStart }: HomeScreenProps) => {
  return (
    <motion.div
      className="absolute inset-0 flex w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.7, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: EASE } }}>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-y-7">
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{
            opacity: 1,
            scale: 1,
            transition: { delay: 0.12, duration: 0.8, ease: EASE },
          }}>
          {[180, 250, 320].map((size, i) => (
            <motion.div
              key={size}
              className="absolute rounded-full border border-foreground/[0.07]"
              style={{ width: size, height: size }}
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.12, 0.5] }}
              transition={{
                duration: 3.8,
                ease: "easeInOut",
                repeat: Infinity,
                delay: i * 0.9,
              }}
            />
          ))}
          <img
            src={neuralNetwork}
            alt="Neural Network"
            className="relative z-10 w-48 h-48 dark:invert opacity-90 drop-shadow-2xl"
          />
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-y-1.5"
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { delay: 0.28, duration: 0.7, ease: EASE },
          }}>
          <h1 className="text-5xl font-mono font-bold tracking-tight">
            Cerebro
          </h1>
          <p className="text-[10px] font-medium tracking-[0.35em] uppercase text-muted-foreground">
            Brain–Computer Interface
          </p>
        </motion.div>

        <motion.div
          className="flex items-center gap-x-2 px-3.5 py-1 rounded-full border border-border/60 bg-background/20 backdrop-blur-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { delay: 0.44, duration: 0.6, ease: EASE },
          }}>
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-foreground/70"
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-[9px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">
            System Ready
          </span>
        </motion.div>
      </div>

      <motion.div
        className="self-center h-3/5 w-px bg-border/40"
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{
          scaleY: 1,
          opacity: 1,
          transition: { delay: 0.3, duration: 0.55, ease: EASE },
        }}
        style={{ originY: 0.5 }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-start justify-center gap-y-9 px-16">
        <motion.div
          className="flex flex-col gap-y-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{
            opacity: 1,
            x: 0,
            transition: { delay: 0.2, duration: 0.7, ease: EASE },
          }}>
          <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-muted-foreground/70">
            Welcome
          </span>
          <h2 className="text-4xl font-semibold leading-tight max-w-xs">
            Control with
            <br />
            your mind.
          </h2>
        </motion.div>

        <motion.div
          className="flex flex-col gap-y-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{
            opacity: 1,
            x: 0,
            transition: { delay: 0.32, duration: 0.7, ease: EASE },
          }}>
          <div className="w-8 h-px bg-foreground/25" />
          <p className="text-sm leading-7 tracking-wide text-muted-foreground max-w-sm">
            A frontend that loads a machine learning model responsible for
            classifying live brain data streamed from an EEG headset. The model
            processes real-time neural signals and maps them to meaningful
            outputs — enabling hands-free interaction driven entirely by
            thought.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{
            opacity: 1,
            x: 0,
            transition: { delay: 0.44, duration: 0.7, ease: EASE },
          }}>
          <LiquidButton
            size="lg"
            variant="default"
            className="cursor-pointer"
            onClick={onStart}>
            Start Session
          </LiquidButton>
        </motion.div>
      </div>
    </motion.div>
  );
};
