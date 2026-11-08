import { defineConfig } from '@playwright/test';

// Component browser coverage bundles the real LegacyCanvas, intercepting only
// the test document. It needs no checkpoint process or engineering/auth bypass.
export default defineConfig({
  testDir:'./tests/e2e',testMatch:'drawing-layout.spec.ts',workers:1,
  use:{channel:'chrome',baseURL:'http://127.0.0.1:3186',viewport:{width:1440,height:900}},
});
