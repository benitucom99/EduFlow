import { test, expect } from "@playwright/test";
import { login, hasCreds, isoOffsetDias } from "./helpers";

// Testes autenticados: precisam de uma conta de teste (PW_EMAIL/PW_PASSWORD).
// Opcionalmente PW_ALUNO_ID para abrir um aluno específico (mais estável).
test.describe("Gerador de Horários Recorrentes", () => {
  test.skip(!hasCreds(), "Define PW_EMAIL/PW_PASSWORD para correr os testes autenticados");

  // Regressão do bug: com início no passado, o preview tem de contar as aulas
  // passadas (antes ficava clampado a hoje → 0 numa janela só de passado).
  // Não-destrutivo: só lê o contador do preview, não submete o horário.
  test("o preview conta aulas em datas passadas", async ({ page }) => {
    await login(page);

    const alunoId = process.env.PW_ALUNO_ID;
    if (alunoId) {
      await page.goto(`/alunos/${alunoId}`);
    } else {
      await page.goto("/alunos");
      await page.locator("table tbody tr").first().click();
      await expect(page).toHaveURL(/\/alunos\/[^/]+$/);
    }

    // O cartão "Horários Base" vive no separador de aulas.
    const aulasTab = page.getByRole("tab", { name: /aulas/i });
    if (await aulasTab.count()) await aulasTab.first().click();

    await page.getByRole("button", { name: /Novo horário/i }).click();
    await expect(page.getByText("Configurar Horário Recorrente")).toBeVisible();

    // Janela só de passado: desliga "ano letivo inteiro" e define início = -28d, fim = hoje.
    await page.locator("#ano-letivo").click(); // desmarca
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(isoOffsetDias(-28)); // início (passado)
    await dateInputs.nth(1).fill(isoOffsetDias(0));    // fim (hoje)

    // Com o slot semanal por defeito (Seg 17:00), uma janela de 4 semanas só no
    // passado deve gerar várias aulas. Antes da correção o preview seria 0.
    const aviso = page.getByText(/Serão sincronizadas/);
    await expect(aviso).toBeVisible();
    const m = (await aviso.innerText()).match(/(\d+)\s*aula/);
    expect(m, "preview sem número de aulas").not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(3);
  });
});
