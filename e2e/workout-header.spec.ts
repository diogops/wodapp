import { expect, test } from "@playwright/test";
import { fixtures, stubApi } from "./fixtures";

/**
 * O cabeçalho global precisa ficar sempre à mostra no treino — é nele que se
 * troca a modalidade e se abre a agenda. E a janela não pode ficar deslocada:
 * no iOS, focar a carga de uma série empurra a página para cima e o
 * cabeçalho some sob a barra de status. Aqui as duas coisas viram invariante.
 */

const fortalecimento = {
  id: 2,
  userId: 1,
  slug: "fortalecimento",
  name: "Fortalecimento",
  color: "#5b7a3f",
  icon: "Anvil",
  grammar: "{}",
  builtIn: true,
  archived: false,
  orderIndex: 6,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
};

const strengthWorkout = {
  id: 9,
  userId: 1,
  modalityId: 2,
  title: "Dia 1 — Clean e força de pernas",
  focus: "Power clean, front squat e transferência para o overhead",
  level: "intermediário",
  category: "Intermediário",
  suggestedDate: null,
  notes: null,
  orderIndex: 2,
  sourceFileKey: null,
  sourceFileName: "treinos_fortalecimento_crossfit.pdf",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  sections: [
    {
      id: 90,
      workoutId: 9,
      title: "Força",
      format: "6 × 3",
      kind: "straight_sets",
      notes: null,
      orderIndex: 0,
      exercises: [
        { id: 900, sectionId: 90, name: "Power clean", prescription: "6 × 3 @ 65–75% 1RM; RPE 6–7", sets: "6", reps: "3", duration: null, load: "65–75% 1RM", notes: null, imageUrl: "/demos/fortalecimento-power-clean.jpg", orderIndex: 0 },
      ],
    },
  ],
};

test.describe("cabeçalho no modo de treino", () => {
  test.beforeEach(async ({ page }) => {
    // Duas modalidades e uma regra só de dia para hoje: o motor de abertura cai
    // em `single_scheduled_today` e abre o treino de força direto, sem picker.
    const today = new Date().getDay();
    await stubApi(page, {
      "workouts.modalities": [
        { id: 1, userId: 1, slug: "crossfit", name: "CrossFit", color: "#e06b3c", icon: "Dumbbell", grammar: "{}", builtIn: true, archived: false, orderIndex: 0, createdAt: "2026-08-01T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },
        fortalecimento,
      ],
      "workouts.list": [...fixtures.workouts, strengthWorkout],
      "schedule.list": [
        { id: 1, userId: 1, modalityId: 2, weekdays: [today], startTime: null, durationMinutes: 60, preferredWorkoutId: 9, enabled: true, createdAt: "2026-08-01T10:00:00.000Z" },
      ],
    });
    await page.goto("/");
    await expect(page.locator(".workout-card-body")).toBeVisible();
    await expect(page.getByText("Power clean", { exact: true })).toBeVisible();
  });

  test("o cabeçalho global fica visível, com o seletor de modalidade ao alcance", async ({ page }) => {
    const header = page.locator("header.app-header");
    await expect(header).toBeVisible();
    const headerBox = (await header.boundingBox())!;
    expect(headerBox.y, "cabeçalho começa acima do topo").toBeGreaterThanOrEqual(0);

    const modality = page.getByLabel("Modalidade");
    await expect(modality).toBeVisible();
    const box = (await modality.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x, "seletor começa fora da tela").toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, "seletor passa da borda direita").toBeLessThanOrEqual(viewport.width);

    // Nada pode transbordar na horizontal: é o sintoma de cabeçalho "apertado".
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, "cabeçalho transborda na horizontal").toBe(false);

    // E de fato dá para trocar: a lista abre com a outra modalidade.
    await modality.click();
    await expect(page.getByRole("option", { name: "Fortalecimento" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("o cabeçalho, o botão voltar e o rodapé cabem juntos na tela", async ({ page }) => {
    const header = (await page.locator("header.app-header").boundingBox())!;
    const back = (await page.getByRole("button", { name: /voltar para a sequência/i }).boundingBox())!;
    expect(back.y, "botão voltar sob o cabeçalho").toBeGreaterThanOrEqual(header.y + header.height - 1);

    const footer = page.locator(".workout-card-actions");
    await expect(footer).toBeVisible();
    const footerBox = (await footer.boundingBox())!;
    expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  });

  test("a janela volta ao topo depois de sair do campo de carga", async ({ page }) => {
    const load = page.getByLabel(/carga de power clean/i);
    await expect(load).toBeVisible();
    await expect(load).toHaveAttribute("inputmode", "decimal");

    // Reproduz o que o iOS faz: com o campo focado, a janela é empurrada.
    // A página precisa poder rolar para o deslocamento existir de fato.
    await load.focus();
    await page.evaluate(() => {
      document.body.style.minHeight = "250vh";
      window.scrollTo(0, 120);
    });
    await expect.poll(() => page.evaluate(() => window.scrollY), { message: "com o campo focado, a janela não deve ser mexida" }).toBe(120);

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect.poll(() => page.evaluate(() => window.scrollY), { message: "depois do blur a janela volta a 0" }).toBe(0);

    // E o cabeçalho voltou a ser alcançável.
    const header = (await page.locator("header.app-header").boundingBox())!;
    expect(header.y).toBeGreaterThanOrEqual(0);
  });
});

test.describe("enquadramento fixo no celular", () => {
  test.beforeEach(async ({ page }) => {
    await stubApi(page);
    await page.goto("/");
    await expect(page.locator(".workout-card-body")).toBeVisible();
  });

  test("bloqueia zoom por pinça e toque duplo, e só rola na vertical", async ({ page }) => {
    const meta = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(meta).toContain("user-scalable=no");
    const touchAction = await page.evaluate(() => getComputedStyle(document.documentElement).touchAction);
    expect(touchAction).toBe("pan-y");
    // Dispositivo real: a guarda de gesto está instalada e cancela a pinça.
    const cancelled = await page.evaluate(() => {
      const event = new Event("gesturestart", { cancelable: true, bubbles: true });
      document.body.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(cancelled, "gesturestart não foi cancelado").toBe(true);
  });

  test("a biblioteca não fica mais larga que a tela e o rodapé é só ícones", async ({ page }) => {
    await page.getByRole("button", { name: /voltar para a sequência/i }).click();
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, "biblioteca transborda na horizontal").toBe(false);

    const buttons = footer.getByRole("button");
    await expect(buttons).toHaveCount(3);
    for (const name of [/gerar um wod/i, /criar um workout/i, /importar um workout/i]) {
      const button = footer.getByRole("button", { name });
      await expect(button).toBeVisible();
      expect((await button.innerText()).trim(), "botão do rodapé com legenda").toBe("");
      expect(await button.getAttribute("title"), "botão do rodapé com dica").toBeNull();
    }
  });

  test("a categoria do atleta só aparece no cabeçalho do desktop", async ({ page }) => {
    const category = page.getByLabel("Sua categoria");
    const width = page.viewportSize()!.width;
    if (width < 640) await expect(category).toBeHidden();
    else await expect(category).toBeVisible();
    await expect(page.getByLabel("Sair")).toBeVisible();
  });
});

test.describe("linha de abas da biblioteca", () => {
  test.beforeEach(async ({ page }) => {
    await stubApi(page);
    await page.goto("/");
    await expect(page.locator(".workout-card-body")).toBeVisible();
    await page.getByRole("button", { name: /voltar para a sequência/i }).click();
  });

  test("no celular: sem título, abas só em ícones à esquerda e visualização à direita, numa linha", async ({ page }) => {
    const width = page.viewportSize()!.width;
    const mobile = width < 640;

    const intro = page.getByRole("heading", { name: "Treinar é aparecer." });
    if (mobile) await expect(intro).toBeHidden();
    else await expect(intro).toBeVisible();

    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(3);
    for (const name of ["Hoje", "Sequência", "Histórico"]) {
      const tab = page.getByRole("tab", { name });
      await expect(tab).toBeVisible();
      if (mobile) expect((await tab.innerText()).trim(), `aba ${name} com rótulo no celular`).toBe("");
    }

    const list = page.getByRole("button", { name: "Ver em lista" });
    const grid = page.getByRole("button", { name: "Ver em cards" });
    await expect(list).toBeVisible();
    await expect(grid).toBeVisible();

    const tabsBox = (await page.getByRole("tablist").boundingBox())!;
    const gridBox = (await grid.boundingBox())!;
    // Mesma linha: os centros verticais coincidem dentro da altura da aba.
    const tabsMid = tabsBox.y + tabsBox.height / 2;
    const gridMid = gridBox.y + gridBox.height / 2;
    expect(Math.abs(tabsMid - gridMid), "visualização não está na linha das abas").toBeLessThan(tabsBox.height / 2);
    if (mobile) {
      expect(tabsBox.x, "abas não alinhadas à esquerda").toBeLessThan(40);
      expect(gridBox.x + gridBox.width, "visualização não alinhada à direita").toBeGreaterThan(width - 40);
    }

    // Trocar a visualização continua funcionando a partir da linha das abas.
    await grid.click();
    await expect(page.getByText("Workout A - Double Under + Engine")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
  });
});
