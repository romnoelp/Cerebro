import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import { cn } from "./lib/utils";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { StarsBackground } from "./components/animate-ui/components/backgrounds/stars";
import { Toaster } from "sileo";
import Layout from "./screens/Layout";
import { HomeScreen } from "./screens/Home";
import { LoadingScreen } from "./screens/Loading";
import {
  loadingSteps,
  stepDuration,
  fadeToSessionDelay,
} from "./screens/intro/constants";
import { ease } from "./lib/constants";
import { type Screen } from "./types";

/** Fraction of the monitor's logical resolution to use for the window. */
const windowScale = 0.8;
/** Minimum window dimensions in logical pixels. */
const minWidth = 960;
const minHeight = 600;

const App = () => {
  const { resolvedTheme } = useTheme();
  const [screen, setScreen] = React.useState<Screen>("home");
  const [stepIndex, setStepIndex] = React.useState(0);

  // Resize the window to a fraction of the current monitor's resolution.
  React.useEffect(() => {
    const fitToMonitor = async () => {
      try {
        const monitor = await currentMonitor();
        if (!monitor) return;
        const scale = monitor.scaleFactor;
        const targetW = Math.max(
          minWidth,
          Math.round((monitor.size.width / scale) * windowScale),
        );
        const targetH = Math.max(
          minHeight,
          Math.round((monitor.size.height / scale) * windowScale),
        );
        const win = getCurrentWindow();
        await win.setSize(new LogicalSize(targetW, targetH));
        await win.center();
      } catch {
        // Running outside Tauri (browser preview) — skip.
      }
    };
    fitToMonitor();
  }, []);

  const handleStart = () => {
    setScreen("loading");
    setStepIndex(0);
  };

  React.useEffect(() => {
    if (screen !== "loading") return;

    if (stepIndex < loadingSteps.length - 1) {
      const t = setTimeout(() => setStepIndex((i) => i + 1), stepDuration);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(
        () => setScreen("session"),
        stepDuration + fadeToSessionDelay,
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
            exit={{ opacity: 0, transition: { duration: 0.6, ease: ease } }}>
            {/* Frameless-window drag region — sits above all content */}
            <div
              data-tauri-drag-region
              className="absolute inset-x-0 top-0 z-50 h-8"
            />
            <StarsBackground
              starColor={resolvedTheme === "dark" ? "#FFF" : "#000"}
              factor={0.25}
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
