import React from "react";
import { motion, AnimatePresence } from "motion/react";
import neuralNetwork from "./assets/neuralNetwork.svg";
import { StarsBackground } from "./components/animate-ui/components/backgrounds/stars";
import { useTheme } from "next-themes";
import { cn } from "./lib/utils";
import { LiquidButton } from "./components/animate-ui/components/buttons/liquid";
import { Progress } from "./components/animate-ui/components/radix/progress";
import Layout from "./screens/Layout";
import { type Screen } from "./types";
import { Toaster } from "sileo";

const LOADING_STEPS = [
  "Building new session...",
  "Analyzing signals...",
  "Requirements complete...",
  "Connections established!",
];

const STEP_DURATION = 1400; // ms between steps
const FADE_TO_SESSION_DELAY = 800; // ms after last step before transitioning

const EASE = [0.16, 1, 0.3, 1] as const;

const App = () => {
  const { resolvedTheme } = useTheme();
  const [screen, setScreen] = React.useState<Screen>("home");
  const [stepIndex, setStepIndex] = React.useState(0);

  const handleStart = () => {
    setScreen("loading");
    setStepIndex(0);
  };

  React.useEffect(() => {
    if (screen !== "loading") return;

    if (stepIndex < LOADING_STEPS.length - 1) {
      const t = setTimeout(() => setStepIndex((i) => i + 1), STEP_DURATION);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(
        () => setScreen("session"),
        STEP_DURATION + FADE_TO_SESSION_DELAY,
      );
      return () => clearTimeout(t);
    }
  }, [screen, stepIndex]);

  const progress = Math.round(((stepIndex + 1) / LOADING_STEPS.length) * 100);

  return (
    <>
      <Toaster position="top-right" theme="dark" />
      <AnimatePresence mode="wait">
        {screen === "session" ? (
          <Layout key="session" />
        ) : (
          <motion.main
            key="intro"
            className="relative flex w-full h-screen overflow-hidden"
            exit={{ opacity: 0, transition: { duration: 0.6, ease: EASE } }}>
            <StarsBackground
              starColor={resolvedTheme === "dark" ? "#FFF" : "#000"}
              className={cn(
                "absolute inset-0",
                "dark:bg-[radial-gradient(ellipse_at_bottom,#262626_0%,#000_100%)] bg-[radial-gradient(ellipse_at_bottom,#f5f5f5_0%,#fff_100%)]",
              )}
            />

            <AnimatePresence mode="wait">
              {/* ── HOME ── */}
              {screen === "home" && (
                <motion.div
                  key="home"
                  className="absolute inset-0 flex w-full"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { duration: 0.7, ease: EASE },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.45, ease: EASE },
                  }}>
                  {/* Left column — branding */}
                  <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-y-7">
                    {/* Logo with pulsing signal rings */}
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
                          animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.5, 0.12, 0.5],
                          }}
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

                    {/* Status badge */}
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
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      <span className="text-[9px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">
                        System Ready
                      </span>
                    </motion.div>
                  </div>

                  {/* Animated vertical separator */}
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

                  {/* Right column — intro & CTA */}
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
                        A frontend that loads a machine learning model
                        responsible for classifying live brain data streamed
                        from an EEG headset. The model processes real-time
                        neural signals and maps them to meaningful outputs —
                        enabling hands-free interaction driven entirely by
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
                        onClick={handleStart}>
                        Start Session
                      </LiquidButton>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* ── LOADING ── */}
              {screen === "loading" && (
                <motion.div
                  key="loading"
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
                  {/* Brand mark with scanning rings */}
                  <div className="flex flex-col items-center gap-y-4">
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
                      Cerebro
                    </span>
                  </div>

                  {/* Boot log */}
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
                              isDone
                                ? "text-foreground/30"
                                : "text-muted-foreground",
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

                  {/* Progress bar + percentage */}
                  <div className="flex flex-col gap-y-3 w-72">
                    <Progress
                      value={progress}
                      className="h-0.5 w-full bg-border/40"
                    />
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
              )}
            </AnimatePresence>
          </motion.main>
        )}
      </AnimatePresence>
    </>
  );
};

export default App;
