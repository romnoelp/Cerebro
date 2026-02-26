export type { AppFile } from '../types';
import { type AppFile } from '../types';

export const FILE_LABELS: Record<AppFile, string> = {
  session: 'Session',
  dashboard: 'Dashboard',
};

export const FILE_SOURCE: Record<AppFile, string> = {};

/** Files that render their live component (not source code) */
export const LIVE_SCREENS: AppFile[] = ['session', 'dashboard'];
