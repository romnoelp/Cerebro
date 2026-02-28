import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import { EASE } from "@/lib/constants";
import AppSidebar from "@/components/AppSidebar";
import CodeView from "@/components/CodeView";
import { FILE_LABELS, FILE_SOURCE, LIVE_SCREENS } from "@/lib/file-contents";
import { type AppFile } from "@/types";
import SessionScreen from "./Session";
import DashboardScreen from "./Dashboard";
import { SiteHeader } from "@/components/site-header";
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars";
import { cn } from "@/lib/utils";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/animate-ui/components/radix/sidebar";

const SCREEN_COMPONENTS: Record<AppFile, React.ComponentType> = {
  session: SessionScreen,
  dashboard: DashboardScreen,
};

const Layout = () => {
  const [activeScreen, setActiveScreen] = React.useState<AppFile>("dashboard");
  const { resolvedTheme } = useTheme();

  const isLiveScreen = LIVE_SCREENS.includes(activeScreen);
  const ActiveScreen = SCREEN_COMPONENTS[activeScreen];

  return (
    <motion.div
      key="dashboard"
      className="w-screen h-screen overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE }}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 56)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
        className="h-screen overflow-hidden">
        <AppSidebar selected={activeScreen} onSelect={setActiveScreen} />

        <SidebarInset className="relative overflow-hidden bg-transparent!">
          <StarsBackground
            starColor={resolvedTheme === "dark" ? "#FFF" : "#000"}
            className={cn(
              "absolute inset-0 -z-10",
              "dark:bg-[radial-gradient(ellipse_at_bottom,#262626_0%,#000_100%)] bg-[radial-gradient(ellipse_at_bottom,#f5f5f5_0%,#fff_100%)]",
            )}
          />
          <SiteHeader page={activeScreen} />
          {isLiveScreen ? (
            <AnimatePresence mode="wait">
              <React.Fragment key={activeScreen}>
                <ActiveScreen />
              </React.Fragment>
            </AnimatePresence>
          ) : (
            <CodeView
              filename={FILE_LABELS[activeScreen]}
              source={FILE_SOURCE[activeScreen]}
            />
          )}
        </SidebarInset>
      </SidebarProvider>
    </motion.div>
  );
};

export default Layout;
