import { defineConfig,devices } from '@playwright/test';
import base from './playwright.config';
// Real channels and engine emulation are reported separately in Task11 QA.
export default defineConfig({...base,use:{baseURL:'http://127.0.0.1:3186',viewport:{width:1440,height:900}},projects:[
  {name:'chrome-windows',use:{browserName:'chromium',channel:'chrome'}},
  {name:'edge-windows',use:{browserName:'chromium',channel:'msedge'}},
  {name:'chromium-windows',use:{browserName:'chromium'}},
  {name:'firefox-windows',use:{browserName:'firefox'}},
  {name:'webkit-windows',use:{browserName:'webkit'}},
  {name:'android-chrome-emulation',testMatch:/(workspace|results-accessibility)\.spec\.ts/,use:{...devices['Pixel 7'],browserName:'chromium',channel:'chrome'}},
  {name:'iphone-webkit-emulation',testMatch:/(workspace|results-accessibility)\.spec\.ts/,use:{...devices['iPhone 13'],browserName:'webkit'}},
]});
