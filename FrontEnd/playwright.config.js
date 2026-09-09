import { defineConfig, devices } from '@playwright/test'

const FRONTEND_PORT = 5183
const BACKEND_PORT = 8123

export default defineConfig({
  testDir: './e2e',
  // A demo walkthrough clicks through a lot of screens, so give it room.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    video: 'on',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Playwright starts (and later shuts down) both servers itself, so there
  // are no stray processes left behind after a run.
  webServer: [
    {
      command: '..\\env\\Scripts\\python.exe -m uvicorn main:app --port 8123',
      cwd: '../Backend',
      url: `http://localhost:${BACKEND_PORT}/docs`,
      reuseExistingServer: false,
      timeout: 60_000,
      // Keep e2e runs off the real database, and allow the e2e frontend port.
      env: {
        MONGO_DB_NAME: 'issue_tracker_e2e_db',
        CORS_ORIGINS: `http://localhost:${FRONTEND_PORT}`,
      },
    },
    {
      command: `npx vite --port ${FRONTEND_PORT} --strictPort --mode e2e`,
      cwd: '.',
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
