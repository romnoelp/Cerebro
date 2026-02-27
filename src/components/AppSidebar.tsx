import * as React from "react";
import {
  IconBrain,
  IconChartBar,
  IconDashboard,
  IconFolder,
  IconListDetails,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
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
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { type AppFile } from "@/types";

export type { AppFile } from "@/types";

interface AppSidebarProps extends Omit<
  React.ComponentProps<typeof Sidebar>,
  "onSelect"
> {
  selected: AppFile;
  onSelect: (file: AppFile) => void;
}

const data = {
  user: {
    name: "Cerebro User",
    email: "user@cerebro.app",
    avatar: "/avatars/user.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: IconDashboard,
    },
    {
      title: "Lifecycle",
      url: "#",
      icon: IconListDetails,
    },
    {
      title: "Analytics",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Projects",
      url: "#",
      icon: IconFolder,
    },
    {
      title: "Team",
      url: "#",
      icon: IconUsers,
    },
  ],

  navSecondary: [{ title: "Settings", url: "#", icon: IconSettings }],
};

const AppSidebar = ({ selected, onSelect, ...props }: AppSidebarProps) => {
  const navItems = data.navMain.map((item) => ({
    ...item,
    isActive: item.title === "Dashboard" && selected === "dashboard",
    onClick:
      item.title === "Dashboard" ? () => onSelect("dashboard") : undefined,
  }));

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="#">
                <IconBrain className="size-5!" />
                <span className="text-base font-semibold">Cerebro</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
