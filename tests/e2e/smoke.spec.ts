import { test, expect } from "@playwright/test";

// Smoke test sem credenciais: confirma que a app carrega e a página de login
// renderiza. Útil para validar baseURL/deploy antes dos testes autenticados.
test("a página de login carrega", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("EduFlow")).toBeVisible();
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});
