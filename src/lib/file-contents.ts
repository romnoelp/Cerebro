import { type AppFile } from '../types';

export type { AppFile } from '../types';

export const FILE_LABELS: Record<AppFile, string> = {
  session: 'Session',
  dashboard: 'Dashboard',
};

export const FILE_SOURCE: Record<AppFile, string> = {
  session: '',
  dashboard: '',
};

/** Files that render their live component (not source code) */
export const LIVE_SCREENS: AppFile[] = ['session', 'dashboard'];
