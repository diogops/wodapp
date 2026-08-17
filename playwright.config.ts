import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de layout no aparelho, não no desktop.
 *
 * WebKit é a engine do Safari, então é o que mais se aproxima do iPhone. Ele
 * NÃO reproduz o standalone do iOS (barra de status, safe-area real, resolução
 * de svh na web view da tela de início) — esses continuam só verificáveis no
 * aparelho. O que este harness pega é a classe muito maior de problemas de
 * layout em viewport de celular.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"]],
  outputDir: "./e2e/.results",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  // Serve o build de produção: é o artefato que vai para a Railway, e é onde o
  // service worker e o manifest existem de verdade.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npx vite preview --port 4173 --strictPort",
        url: "http://localhost:4173",
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: "iphone-webkit",
      use: { ...devices["iPhone 14 Pro Max"] },
    },
    {
      name: "iphone-se-webkit",
      // A tela pequena é onde a compactação do treino aperta primeiro.
      use: { ...devices["iPhone SE"] },
    },
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
