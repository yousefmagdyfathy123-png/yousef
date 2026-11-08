import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',testMatch:['drawing-focus.spec.ts','drawing-layout.spec.ts'],workers:1,
  expect:{timeout:5000},use:{channel:'chrome',baseURL:'http://127.0.0.1:3186',viewport:{width:1440,height:900}}});
