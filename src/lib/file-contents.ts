import { type AppFile } from "../types";

export type { AppFile } from "../types";

export const fileLabels: Record<AppFile, string> = {
  session: "Session",
  dashboard: "Dashboard",
};

export const fileSource: Record<AppFile, string> = {
  session: "",
  dashboard: "",
};

/** Files that render their live component (not source code) */
export const liveScreens: AppFile[] = ["session", "dashboard"];
