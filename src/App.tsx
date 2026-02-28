import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import { cn } from "./lib/utils";
import { StarsBackground } from "./components/animate-ui/components/backgrounds/stars";
import { Toaster } from "sileo";
import Layout from "./screens/Layout";
import { HomeScreen } from "./screens/Home";
import { LoadingScreen } from "./screens/Loading";
import {
  LOADING_STEPS,
  STEP_DURATION,
  FADE_TO_SESSION_DELAY,
} from "./screens/intro/constants";
import { EASE } from "./lib/constants";
import { type Screen } from "./types";

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

  return (
    <>
      <Toaster
        position="top-center"
        theme={(resolvedTheme as "light" | "dark") ?? "dark"}
      />
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
              {screen === "home" && (
                <HomeScreen key="home" onStart={handleStart} />
              )}
              {screen === "loading" && (
                <LoadingScreen key="loading" stepIndex={stepIndex} />
              )}
            </AnimatePresence>
          </motion.main>
        )}
      </AnimatePresence>
    </>
  );
};

export default App;
