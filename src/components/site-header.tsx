import { getCurrentWindow } from "@tauri-apps/api/window";
import { SidebarTrigger } from "@/components/animate-ui/components/radix/sidebar";

export function SiteHeader() {
  const win = getCurrentWindow();

  return (
    <header
      data-tauri-drag-region
      className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) select-none">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
      </div>

      {/* Custom window controls */}
      <div className="flex items-center shrink-0 gap-0 pr-2">
        <button
          onClick={() => win.minimize()}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-foreground/8 hover:text-foreground/80"
          aria-label="Minimize">
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" rx="0.5" />
          </svg>
        </button>
        <button
          onClick={() => win.close()}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-red-500/15 hover:text-red-500"
          aria-label="Close">
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round">
            <line x1="1" y1="1" x2="9" y2="9" />
            <line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      </div>
    </header>
  );
}
