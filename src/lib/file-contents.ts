import appRaw from '../App.tsx?raw';
import sessionRaw from '../screens/Session.tsx?raw';
import dashboardRaw from '../screens/Dashboard.tsx?raw';
import appSidebarRaw from '../components/AppSidebar.tsx?raw';
import gravityStarsRaw from '../components/animate-ui/components/backgrounds/gravity-stars.tsx?raw';
import buttonRaw from '../components/animate-ui/components/buttons/button.tsx?raw';
import flipRaw from '../components/animate-ui/components/buttons/flip.tsx?raw';
import liquidRaw from '../components/animate-ui/components/buttons/liquid.tsx?raw';
import filesRaw from '../components/animate-ui/components/radix/files.tsx?raw';
import progressRaw from '../components/animate-ui/components/radix/progress.tsx?raw';

export type { AppFile } from '../types';
import { type AppFile } from '../types';

export const FILE_LABELS: Record<AppFile, string> = {
  app: 'App.tsx',
  session: 'Session',
  dashboard: 'Dashboard',
  appsidebar: 'AppSidebar.tsx',
  'comp-gravity-stars': 'gravity-stars.tsx',
  'comp-button': 'button.tsx',
  'comp-flip': 'flip.tsx',
  'comp-liquid': 'liquid.tsx',
  'comp-files': 'files.tsx',
  'comp-progress': 'progress.tsx',
};

export const FILE_SOURCE: Record<AppFile, string> = {
  app: appRaw,
  session: sessionRaw,
  dashboard: dashboardRaw,
  appsidebar: appSidebarRaw,
  'comp-gravity-stars': gravityStarsRaw,
  'comp-button': buttonRaw,
  'comp-flip': flipRaw,
  'comp-liquid': liquidRaw,
  'comp-files': filesRaw,
  'comp-progress': progressRaw,
};

/** Files that render their live component (not source code) */
export const LIVE_SCREENS: AppFile[] = ['session', 'dashboard'];
