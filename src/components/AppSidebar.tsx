import * as React from "react";
import { IconDashboard, IconWaveSine } from "@tabler/icons-react";
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
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
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
      icon: IconDashboard,
    },
    {
      title: "Session",
      url: "#",
      icon: IconWaveSine,
    },
  ],
};

const AppSidebar = ({ selected, onSelect, ...props }: AppSidebarProps) => {
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
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="#">
                <img
                  src={neuralNetwork}
                  alt="Cerebro"
                  className="size-5 dark:invert"
                />
                <span className="text-base font-semibold">Cerebro</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
