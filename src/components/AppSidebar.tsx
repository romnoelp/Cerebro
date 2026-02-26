import * as React from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/animate-ui/components/radix/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import {
  ChevronsUpDown,
  LayoutDashboard,
  BrainCircuit,
  Settings,
} from "lucide-react";
import { type AppFile, FILE_LABELS } from "@/lib/file-contents";
import { useIsMobile } from "@/hooks/use-mobile";

export type { AppFile } from "@/types";

interface AppSidebarProps {
  selected: AppFile;
  onSelect: (file: AppFile) => void;
}

const NAV_SCREENS: { key: AppFile; icon: React.ElementType }[] = [
  { key: "dashboard", icon: LayoutDashboard },
  { key: "session", icon: BrainCircuit },
];

const AppSidebar = ({ selected, onSelect }: AppSidebarProps) => {
  const isMobile = useIsMobile();

  return (
    <Sidebar collapsible="icon">
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <BrainCircuit className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Cerebro</span>
                    <span className="truncate text-xs">EEG Interface</span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Workspace
                </DropdownMenuLabel>
                <DropdownMenuItem className="gap-2 p-2">
                  <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                    <BrainCircuit className="size-4 shrink-0" />
                  </div>
                  <span className="font-medium">Cerebro EEG MK-1</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="gap-2 p-2">
                    <Settings className="size-4 text-muted-foreground" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_SCREENS.map(({ key, icon: Icon }) => (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton
                  tooltip={FILE_LABELS[key]}
                  isActive={selected === key}
                  onClick={() => onSelect(key)}>
                  <Icon />
                  <span>{FILE_LABELS[key]}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
                <BrainCircuit className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Cerebro</span>
                <span className="truncate text-xs text-muted-foreground">
                  v0.1.0
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
