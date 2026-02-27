import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/animate-ui/components/radix/sidebar";
import { type AppFile } from "@/types";

const PAGE_TITLES: Record<AppFile, string> = {
  dashboard: "EEG Dashboard",
  session: "Session",
};

export function SiteHeader({ page }: { page?: AppFile }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">
          {page ? PAGE_TITLES[page] : "EEG Dashboard"}
        </h1>
      </div>
    </header>
  );
}
