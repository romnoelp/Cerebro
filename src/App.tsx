import { motion, AnimatePresence } from "motion/react";
import { GravityStarsBackground } from "./components/animate-ui/components/backgrounds/gravity-stars";
import { BrainCircuit } from "lucide-react";
import {
  FlipButton,
  FlipButtonBack,
  FlipButtonFront,
} from "./components/animate-ui/components/buttons/flip";
import { Orbit } from "./components/animate-ui/icons/orbit";
import { AnimateIcon } from "./components/animate-ui/icons/icon";
import Layout from "./screens/Layout";
import React from "react";
import { type Screen } from "./types";

const LOADING_STEPS = [
  "Building new session...",
  "Analyzing signals...",
  "Requirements complete!",
];

const STEP_DURATION = 1400; // ms between steps
const FADE_TO_SESSION_DELAY = 800; // ms after last step before transitioning

const App = () => {
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
      // Last step shown — wait then go to session
      const t = setTimeout(
        () => setScreen("session"),
        STEP_DURATION + FADE_TO_SESSION_DELAY,
      );
      return () => clearTimeout(t);
    }
  }, [screen, stepIndex]);

  return (
    <AnimatePresence mode="wait">
      {screen === "session" ? (
        <Layout key="session" />
      ) : (
        <motion.main
          key="intro"
          className="w-screen h-screen relative"
          exit={{
            opacity: 0,
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
          }}>
          <GravityStarsBackground
            starsCount={270}
            glowAnimation="instant"
            glowIntensity={2}
            mouseGravity="attract">
            <div className="absolute inset-0 pointer-events-none z-10">
              <AnimatePresence mode="wait">
                {/* ── HOME ── */}
                {screen === "home" && (
                  <motion.div
                    key="home"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-6"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      y: -20,
                      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                    }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                    <div className="flex items-center gap-5">
                      <motion.div
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.25,
                          duration: 0.7,
                          ease: [0.16, 1, 0.3, 1],
                        }}>
                        <BrainCircuit size={80} strokeWidth={1.5} />
                      </motion.div>
                      <motion.h1
                        className="text-7xl font-bold"
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.35,
                          duration: 0.7,
                          ease: [0.16, 1, 0.3, 1],
                        }}>
                        <span className="text-black">Cerebro</span>
                      </motion.h1>
                    </div>
                    <motion.div
                      className="pointer-events-auto"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.55,
                        duration: 0.7,
                        ease: [0.16, 1, 0.3, 1],
                      }}>
                      <FlipButton
                        variant={"default"}
                        size={"lg"}
                        onClick={handleStart}>
                        <FlipButtonFront>
                          Ready to scan your brain?
                        </FlipButtonFront>
                        <FlipButtonBack>Start session!</FlipButtonBack>
                      </FlipButton>
                    </motion.div>
                  </motion.div>
                )}

                {/* ── LOADING ── */}
                {screen === "loading" && (
                  <motion.div
                    key="loading"
                    className="absolute bottom-8 left-8 flex items-center gap-6"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.95,
                      transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                    }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
                    {/* Animated Orbit icon */}
                    <AnimateIcon animate loop className="text-black">
                      <Orbit size={56} />
                    </AnimateIcon>

                    {/* Sequential step labels */}
                    <div className="relative h-8 flex items-center">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={stepIndex}
                          className="text-black text-xl font-medium tracking-wide whitespace-nowrap"
                          initial={{ opacity: 0, x: 18 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -18 }}
                          transition={{
                            duration: 0.38,
                            ease: [0.16, 1, 0.3, 1],
                          }}>
                          {LOADING_STEPS[stepIndex]}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GravityStarsBackground>
        </motion.main>
      )}
    </AnimatePresence>
  );
};

export default App;
