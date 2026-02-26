import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SignalZero } from "@/components/animate-ui/icons/signal-zero";
import { SignalLow } from "@/components/animate-ui/icons/signal-low";
import { SignalMedium } from "@/components/animate-ui/icons/signal-medium";
import { SignalHigh } from "@/components/animate-ui/icons/signal-high";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/animate-ui/components/base/dialog";
import {
  Code,
  CodeBlock,
  CodeHeader,
} from "@/components/animate-ui/components/animate/code";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Orbit } from "@/components/animate-ui/icons/orbit";
import { RippleButton } from "@/components/animate-ui/components/buttons/ripple";

const SIGNAL_LEVELS = [
  SignalZero,
  SignalLow,
  SignalMedium,
  SignalHigh,
] as const;

const SIGNAL_COLORS = [
  "oklch(0.577 0.245 27.325)", // zero   — red
  "oklch(0.646 0.222 41.116)", // low    — orange
  "oklch(0.852 0.199 91.936)", // medium — yellow
  "oklch(0.648 0.2 131.684)", // high   — green
] as const;

const SIGNAL_CYCLE_MS = 1200;

const SIGNAL_LEVEL_NAMES = ["None", "Low", "Medium", "High"] as const;

const INSTRUCTIONS = `# Connect your EEG Headset

Follow these steps to pair your device:

1. Open your EEG headset
2. Switch to pairing mode
3. Check if your Bluetooth is on
4. Pair your device`;

type ConnectionState = "idle" | "checking" | "connected";

const DashboardScreen = () => {
  const [hasSignal, setHasSignal] = React.useState(false);
  const [signalIndex, setSignalIndex] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [connectionState, setConnectionState] =
    React.useState<ConnectionState>("idle");
  const [snapshotCode, setSnapshotCode] = React.useState("");

  useEffect(() => {
    if (!hasSignal) return;
    const interval = setInterval(() => {
      setSignalIndex((i) => (i + 1) % SIGNAL_LEVELS.length);
    }, SIGNAL_CYCLE_MS);
    return () => clearInterval(interval);
  }, [hasSignal]);

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (open && hasSignal) {
      const level = SIGNAL_LEVEL_NAMES[signalIndex];
      setSnapshotCode(
        `# Device Info\n\nDevice name:        Cerebro EEG MK-1\nCurrent signal:     ${level}\nMAC Address:        A4:C3:F0:85:12:3E`,
      );
    }
    if (!open) setTimeout(() => setConnectionState("idle"), 400);
  };

  const handleCheckConnection = () => {
    setConnectionState("checking");
    setTimeout(() => {
      setConnectionState("connected");
      setTimeout(() => {
        setDialogOpen(false);
        setHasSignal(true);
        setTimeout(() => setConnectionState("idle"), 400);
      }, 1400);
    }, 2200);
  };

  const SignalIcon = SIGNAL_LEVELS[signalIndex];

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="flex items-center justify-between w-full h-16 py-2 px-4">
        {/* Signal strength — left */}
        <div className="flex gap-x-2 items-end">
          <p className="text-sm text-muted-foreground">Signal Strength:</p>
          {hasSignal ? (
            <SignalIcon
              key={signalIndex}
              animation="default"
              loop
              loopDelay={600}
              style={{ color: SIGNAL_COLORS[signalIndex] }}
            />
          ) : (
            <SignalZero
              animation="default"
              style={{ color: "oklch(0.6 0 0)" }}
            />
          )}
        </div>

        {/* Buttons — right */}
        <div className="flex gap-x-4 items-center">
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger
              render={
                <RippleButton variant="default">
                  {hasSignal ? "Check Signal" : "Try to connect"}
                </RippleButton>
              }
            />
            <DialogPopup
              className="sm:max-w-120"
              showCloseButton={connectionState === "idle"}>
              <DialogHeader>
                <DialogTitle>
                  {hasSignal ? "Signal Info" : "Connect EEG Headset"}
                </DialogTitle>
              </DialogHeader>

              {hasSignal ? (
                <Code code={snapshotCode} className="w-full">
                  <CodeHeader>device-info.md</CodeHeader>
                  <CodeBlock
                    lang="markdown"
                    writing
                    delay={100}
                    duration={1200}
                  />
                </Code>
              ) : (
                <Code code={INSTRUCTIONS} className="w-full">
                  <CodeHeader>setup-guide.md</CodeHeader>
                  <CodeBlock
                    lang="markdown"
                    writing
                    delay={100}
                    duration={2500}
                  />
                </Code>
              )}

              {!hasSignal && (
                <DialogFooter>
                  <AnimatePresence mode="wait">
                    {connectionState === "idle" && (
                      <motion.div
                        key="btn"
                        className="w-full flex justify-end"
                        initial={{ opacity: 1, scaleX: 1 }}
                        exit={{
                          scaleX: 0,
                          opacity: 0,
                          transition: {
                            duration: 0.35,
                            ease: [0.16, 1, 0.3, 1],
                          },
                        }}
                        style={{ originX: 0.5 }}>
                        <RippleButton onClick={handleCheckConnection}>
                          Check connection
                        </RippleButton>
                      </motion.div>
                    )}

                    {connectionState !== "idle" && (
                      <motion.div
                        key="status"
                        className="w-full flex items-center justify-center gap-3 py-1"
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{
                          opacity: 1,
                          scaleX: 1,
                          transition: {
                            duration: 0.45,
                            ease: [0.16, 1, 0.3, 1],
                          },
                        }}
                        style={{ originX: 0.5 }}>
                        <AnimateIcon
                          animate
                          loop={connectionState === "checking"}>
                          <Orbit size={20} />
                        </AnimateIcon>
                        <span className="text-sm font-medium">
                          {connectionState === "checking"
                            ? "Connecting..."
                            : "Software and headset connected"}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </DialogFooter>
              )}
            </DialogPopup>
          </Dialog>

          <RippleButton
            variant="destructive"
            onClick={() => {
              setHasSignal(false);
              setSignalIndex(0);
            }}>
            Cut Signal
          </RippleButton>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
