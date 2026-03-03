import * as React from "react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { IconBrandGithub } from "@tabler/icons-react";
import neuralNetwork from "@/assets/neuralNetwork.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/animate-ui/components/radix/sidebar";
import {
  PreviewCard,
  PreviewCardTrigger,
  PreviewCardPanel,
} from "@/components/animate-ui/components/base/preview-card";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sun } from "@/components/animate-ui/icons/sun";
import { Moon } from "@/components/animate-ui/icons/moon";
import { LayoutDashboard } from "@/components/animate-ui/icons/layout-dashboard";
import { ChartSpline } from "@/components/animate-ui/icons/chart-spline";
import { type AppFile } from "@/types";

interface AppSidebarProps extends Omit<
  React.ComponentProps<typeof Sidebar>,
  "onSelect"
> {
  selected: AppFile;
  onSelect: (file: AppFile) => void;
}

const data = {
  user: {
    name: "romnoelp",
    email: "romnoel.petracorta@neu.edu.ph",
    avatar: "/avatars/Romy.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: <LayoutDashboard animateOnHover className="size-4" />,
    },
    {
      title: "Session",
      url: "#",
      icon: <ChartSpline animateOnHover className="size-4" />,
    },
  ],
};

const hintKey = "cerebro:logo-hint-seen";

const AppSidebar = ({ selected, onSelect, ...props }: AppSidebarProps) => {
  const [hintSeen, setHintSeen] = React.useState<boolean>(
    () => localStorage.getItem(hintKey) === "1",
  );
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const dismissHint = React.useCallback(() => {
    if (!hintSeen) {
      localStorage.setItem(hintKey, "1");
      setHintSeen(true);
    }
  }, [hintSeen]);

  const navItems = data.navMain.map((item) => ({
    ...item,
    isActive:
      (item.title === "Dashboard" && selected === "dashboard") ||
      (item.title === "Session" && selected === "session"),
    onClick:
      item.title === "Dashboard"
        ? () => onSelect("dashboard")
        : item.title === "Session"
          ? () => onSelect("session")
          : undefined,
  }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <PreviewCard>
              <PreviewCardTrigger
                render={
                  <SidebarMenuButton
                    className="data-[slot=sidebar-menu-button]:p-1.5! cursor-pointer group/cerebro"
                    onMouseEnter={dismissHint}>
                    <span className="relative flex items-center justify-center shrink-0">
                      {/* Persistent hint ring — visible until first hover */}
                      {!hintSeen && (
                        <motion.span
                          className="absolute inline-flex size-7 rounded-full border border-foreground/40"
                          animate={{
                            scale: [1, 1.55, 1],
                            opacity: [0.7, 0, 0.7],
                          }}
                          transition={{
                            duration: 2,
                            ease: "easeInOut",
                            repeat: Infinity,
                          }}
                        />
                      )}
                      {/* On-hover ping ring — visible only while hovering (after hint dismissed) */}
                      {hintSeen && (
                        <span className="absolute inline-flex size-5 rounded-full border border-foreground/30 opacity-0 group-hover/cerebro:opacity-100 group-hover/cerebro:animate-ping transition-opacity" />
                      )}
                      <img
                        src={neuralNetwork}
                        alt="Cerebro"
                        className="relative size-5 dark:invert"
                      />
                    </span>
                    <span className="text-base font-semibold">Cerebro</span>
                  </SidebarMenuButton>
                }
              />
              <PreviewCardPanel
                side="right"
                sideOffset={12}
                className="w-72 p-0 overflow-hidden">
                {/* Header with animated neural network */}
                <div className="relative flex items-center justify-center bg-muted/40 py-7 border-b border-border/50">
                  {[64, 90, 116].map((size, i) => (
                    <motion.div
                      key={size}
                      className="absolute rounded-full border border-foreground/8"
                      style={{ width: size, height: size }}
                      animate={{
                        scale: [1, 1.06, 1],
                        opacity: [0.45, 0.1, 0.45],
                      }}
                      transition={{
                        duration: 3.6,
                        ease: "easeInOut",
                        repeat: Infinity,
                        delay: i * 0.85,
                      }}
                    />
                  ))}
                  <img
                    src={neuralNetwork}
                    alt="Cerebro"
                    className="relative z-10 size-10 dark:invert opacity-80 drop-shadow-md"
                  />
                </div>

                {/* Developer info */}
                <div className="flex flex-col gap-3.5 p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/avatars/Romy.jpg"
                      alt="R. Petracorta"
                      className="size-11 rounded-full border border-border/60 object-cover shrink-0"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold leading-tight">
                        R. Petracorta
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        Developer
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    EEG-based brain–computer interface with real-time neural
                    signal classification using TCN + DDQN models.
                  </p>

                  <a
                    href="https://github.com/romnoelp"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <IconBrandGithub className="size-3.5 shrink-0" />
                    github.com/romnoelp
                  </a>
                </div>
              </PreviewCardPanel>
            </PreviewCard>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(isDark ? "light" : "dark")}
              tooltip={isDark ? "Switch to Light" : "Switch to Dark"}
              className="cursor-pointer">
              {isDark ? (
                <Sun animateOnHover className="size-4" />
              ) : (
                <Moon animateOnHover className="size-4" />
              )}
              <span>Switch to {isDark ? "Light" : "Dark"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
