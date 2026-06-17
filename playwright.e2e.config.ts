import { defineConfig, devices } from "@playwright/test";

// Config dos testes E2E próprios (separada da playwright.config.ts gerida pela
// Lovable). Corre com:  npm run test:e2e
// Alvo via env — por defeito o dev server local (porta 8080, ver vite.config.ts),
// mas normalmente aponta-se para o preview do Vercel:
//   PW_BASE_URL=https://<preview-develop>.vercel.app PW_EMAIL=... PW_PASSWORD=...
// As credenciais (conta de teste em staging) vivem só no ambiente, nunca no repo.
const baseURL = process.env.PW_BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
