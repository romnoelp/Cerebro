import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
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

const LIVE_COMPONENTS: Record<string, React.ReactNode> = {
  session: <SessionScreen />,
  dashboard: <DashboardScreen />,
};

const Layout = () => {
  const [selected, setSelected] = React.useState<AppFile>("dashboard");
  const { resolvedTheme } = useTheme();

  const isLive = LIVE_SCREENS.includes(selected);

  return (
    <motion.div
      key="dashboard"
      className="w-screen h-screen overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 56)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }>
        {/* Sidebar — state persists across file changes */}
        <AppSidebar selected={selected} onSelect={setSelected} />

        {/* Main content */}
        <SidebarInset className="relative overflow-hidden bg-transparent!">
          <StarsBackground
            starColor={resolvedTheme === "dark" ? "#FFF" : "#000"}
            className={cn(
              "absolute inset-0 -z-10",
              "dark:bg-[radial-gradient(ellipse_at_bottom,#262626_0%,#000_100%)] bg-[radial-gradient(ellipse_at_bottom,#f5f5f5_0%,#fff_100%)]",
            )}
          />
          <SiteHeader page={selected} />
          {isLive ? (
            <AnimatePresence mode="wait">
              <React.Fragment key={selected}>
                {LIVE_COMPONENTS[selected]}
              </React.Fragment>
            </AnimatePresence>
          ) : (
            <CodeView
              filename={FILE_LABELS[selected]}
              source={FILE_SOURCE[selected]}
            />
          )}
        </SidebarInset>
      </SidebarProvider>
    </motion.div>
  );
};

export default Layout;
