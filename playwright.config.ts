import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'
import { BACK_DIR } from './e2e/back-end'

const CI = Boolean(process.env.CI)

/**
 * The critical journeys, in a real browser, against the real back end.
 *
 * The front end runs in development mode: only `nuxt dev` serves the API on the
 * front end's own origin (devProxy), as nginx does in production.
 */
export default defineConfig<ConfigOptions>({
  testDir: './e2e',
  // The journeys share the back end's database, and its limit of five sign-ins
  // a minute: they run one at a time, and are tried again once at most.
  workers: 1,
  fullyParallel: false,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
      dev: true,
      // The server renders the public pages with the back end of the journeys,
      // as a preproduction would, with fictitious contact details.
      env: {
        NUXT_API_INTERNAL_URL: 'http://127.0.0.1:8000',
        NUXT_PUBLIC_SITE_URL: 'https://site.example',
        NUXT_PUBLIC_PREPROD: 'true',
        NUXT_PUBLIC_CONTACT_EMAIL: 'contact@example.test',
      },
    },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // The back end, where the development proxy looks for it (nuxt.config.ts).
  webServer: {
    command: 'uv run python manage.py runserver 127.0.0.1:8000 --noreload',
    cwd: BACK_DIR,
    url: 'http://127.0.0.1:8000/api/health',
    // Locally, a back end already running serves as is.
    reuseExistingServer: !CI,
    stdout: 'pipe',
  },
})
