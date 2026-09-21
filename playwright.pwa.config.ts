import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'./pwa-tests',use:{baseURL:'http://127.0.0.1:4180',channel:'msedge'},webServer:{command:'npm run preview -- --port 4180',url:'http://127.0.0.1:4180',reuseExistingServer:!process.env.CI}})

