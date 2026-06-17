import { Page, expect } from "@playwright/test";

/** Há credenciais de teste no ambiente? (gate para testes que exigem login) */
export const hasCreds = () => !!(process.env.PW_EMAIL && process.env.PW_PASSWORD);

/**
 * Faz login na app (rota /login → /dashboard). Usa as credenciais de uma conta
 * de teste em staging, fornecidas via PW_EMAIL/PW_PASSWORD. Nunca hardcodar.
 */
export async function login(page: Page) {
  const email = process.env.PW_EMAIL;
  const password = process.env.PW_PASSWORD;
  if (!email || !password) throw new Error("PW_EMAIL/PW_PASSWORD não definidos no ambiente");
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

/** Data ISO (yyyy-MM-dd) com offset de dias relativo a hoje, em hora local. */
export function isoOffsetDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
