export const uiProjectNames = [
  'chrome-windows', 'edge-windows', 'chromium-windows', 'firefox-windows', 'webkit-windows',
  'android-chrome-emulation', 'iphone-webkit-emulation',
] as const;

export const uiSuites = {
  desktop: ['desktop.spec.ts'],
  mobile: ['mobile.spec.ts'],
  print: ['print.spec.ts'],
  'protected-journeys': ['full-journey.spec.ts', 'preferences.spec.ts', 'workspace-recovery.spec.ts',
    'workspace-network.spec.ts', 'workspace-session-resume.spec.ts'],
  'accessible-results': ['full-journey.spec.ts'],
  'public-identity': ['desktop.spec.ts', 'print.spec.ts'],
} as const;
