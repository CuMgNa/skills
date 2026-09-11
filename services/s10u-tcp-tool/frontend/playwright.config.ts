import { defineConfig } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const frontend = path.dirname(fileURLToPath(import.meta.url))
const root = path.dirname(frontend)
const python = path.join(root,'.venv',process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
const externalUrl = process.env.E2E_BASE_URL
export default defineConfig({
  testDir:'./tests/e2e', fullyParallel:false, workers:1, timeout:45000,
  expect:{timeout:10000}, reporter:'list',
  outputDir:'./test-results',
  use:{baseURL:externalUrl || 'http://127.0.0.1:8767',headless:true,channel:process.env.E2E_BROWSER_CHANNEL || 'chrome',trace:'retain-on-failure',screenshot:'only-on-failure',acceptDownloads:true},
  webServer:externalUrl ? undefined : {
    command:`"${python}" -m s10u_tool --host 127.0.0.1 --port 8767 --data-dir "${path.join(root,'.temps','e2e')}"`,
    cwd:root, env:{PYTHONPATH:path.join(root,'backend')}, url:'http://127.0.0.1:8767/api/bootstrap', reuseExistingServer:false,timeout:30000,
  },
})
