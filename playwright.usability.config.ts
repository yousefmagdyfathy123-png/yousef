import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',testMatch:['workspace-usability.spec.ts','workspace-layout.spec.ts','drawing-layout.spec.ts','mobile.spec.ts','desktop.spec.ts','print.spec.ts'],workers:1,
  use:{baseURL:'http://127.0.0.1:3186',viewport:{width:1440,height:900},
    launchOptions:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}},
});
