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
                animate={{ opacity: 1, transition: { duration: 0.7, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.45, ease: EASE } }}>
                {/* Left column — branding */}
                <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-y-6 border-r border-border/30">
                  <motion.img
                    src={neuralNetwork}
                    alt="Neural Network"
                    className="w-56 h-56 dark:invert opacity-90 drop-shadow-2xl"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.7, ease: EASE } }}
                  />
                  <motion.div
                    className="flex flex-col items-center gap-y-1"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.28, duration: 0.7, ease: EASE } }}>
                    <h1 className="text-6xl font-mono font-bold tracking-tight">Cerebro</h1>
                    <p className="text-xs font-medium tracking-[0.3em] uppercase text-muted-foreground">
                      Brain–Computer Interface
                    </p>
                  </motion.div>
                </div>

                {/* Right column — intro & CTA */}
                <div className="relative z-10 flex flex-1 flex-col items-start justify-center gap-y-8 px-16">
                  <motion.div
                    className="flex flex-col gap-y-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: 0.2, duration: 0.7, ease: EASE } }}>
                    <span className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
                      Welcome
                    </span>
                    <h2 className="text-3xl font-semibold leading-snug max-w-xs">
                      Control with your mind.
                    </h2>
                  </motion.div>

                  <motion.p
                    className="text-sm leading-7 tracking-wide text-muted-foreground max-w-sm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: 0.32, duration: 0.7, ease: EASE } }}>
                    A frontend that loads a machine learning model responsible for
                    classifying live brain data streamed from an EEG headset. The
                    model processes real-time neural signals and maps them to
                    meaningful outputs — enabling hands-free interaction driven
                    entirely by thought.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: 0.44, duration: 0.7, ease: EASE } }}>
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
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-y-10"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE } }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.4, ease: EASE } }}>
                {/* Brand mark */}
                <div className="flex flex-col items-center gap-y-2 mb-2">
                  <img
                    src={neuralNetwork}
                    alt="Neural Network"
                    className="w-16 h-16 dark:invert opacity-60"
                  />
                  <span className="text-sm font-mono font-semibold tracking-[0.25em] uppercase text-muted-foreground">
                    Cerebro
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-y-4 w-80">
                  <Progress
                    value={progress}
                    className="h-0.75 w-full bg-border/40"
                  />

                  {/* Step message */}
                  <div className="relative h-5 flex items-center">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={stepIndex}
                        className="absolute text-sm font-medium tracking-wide text-muted-foreground whitespace-nowrap"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } }}
                        exit={{ opacity: 0, y: -6, transition: { duration: 0.25, ease: EASE } }}>
                        {LOADING_STEPS[stepIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Step counter */}
                <span className="text-xs tabular-nums text-muted-foreground/50 tracking-wider">
                  {stepIndex + 1} / {LOADING_STEPS.length}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.main>
      )}
    </AnimatePresence>
  );
};

export default App;
