import { devices, defineConfig } from '@playwright/test';
import auth from './playwright.auth.config';

if (!process.env.ALFADATA_UI_PROJECT) throw new Error('Use npm run acceptance:ui for the protected UI matrix');

const uiProjects = [
  { name: 'chrome-windows', use: { browserName: 'chromium' as const, channel: 'chrome' } },
  { name: 'edge-windows', use: { browserName: 'chromium' as const, channel: 'msedge' } },
  { name: 'chromium-windows', use: { browserName: 'chromium' as const } },
  { name: 'firefox-windows', use: { browserName: 'firefox' as const } },
  { name: 'webkit-windows', use: { browserName: 'webkit' as const } },
  { name: 'android-chrome-emulation', use: { ...devices['Pixel 7'], deviceScaleFactor: 2, channel: 'chrome' } },
  { name: 'iphone-webkit-emulation', use: { ...devices['iPhone 13'], deviceScaleFactor: 2, channel: undefined } },
];

export default defineConfig({
  ...auth,
  testMatch: ['desktop.spec.ts', 'mobile.spec.ts', 'print.spec.ts', 'full-journey.spec.ts',
    'preferences.spec.ts', 'workspace-recovery.spec.ts', 'workspace-network.spec.ts',
    'workspace-session-resume.spec.ts'],
  outputDir: '.local/ui-acceptance/screenshots',
  use: { ...auth.use, channel: undefined, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  projects: uiProjects,
});
