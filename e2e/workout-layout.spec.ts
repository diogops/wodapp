import { expect, test } from "@playwright/test";
import { stubApi } from "./fixtures";

/**
 * Invariantes de layout da tela de treino — a superfície onde praticamente
 * todos os bugs desta aplicação apareceram, e que até agora só era verificável
 * por screenshot enviado do celular.
 */
test.describe("tela de treino", () => {
  test.beforeEach(async ({ page }) => {
    await stubApi(page);
    await page.goto("/");
    // Espera o card do treino existir, não um texto qualquer: "Workout"
    // aparece em vários lugares e a asserção ficava ambígua.
    await expect(page.locator(".workout-card-body")).toBeVisible();
  });

  test("não rola a página inteira, só o corpo do workout", async ({ page }) => {
    // O contrato central do modo de treino: um toque não pode mover a página.
    const scrollable = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        vertical: doc.scrollHeight > doc.clientHeight + 1,
        horizontal: doc.scrollWidth > doc.clientWidth + 1,
      };
    });
    expect(scrollable.horizontal, "rolagem horizontal").toBe(false);
    expect(scrollable.vertical, "rolagem vertical global").toBe(false);
  });

  test("o rodapé de ações fica visível dentro da tela", async ({ page }) => {
    // O bug que mais voltou: Concluir/Pular cortados pela borda inferior.
    const footer = page.locator(".workout-card-actions");
    await expect(footer).toBeVisible();

    const box = await footer.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box).not.toBeNull();
    expect(box!.y + box!.height, "rodapé passa do fim da tela").toBeLessThanOrEqual(viewport.height);
  });

  test("o workout ocupa a maior parte da altura útil", async ({ page }) => {
    // O spec do produto pede que o corpo do treino domine a tela; sem isto,
    // volta a sobrar faixa morta ou chrome demais.
    const ratio = await page.evaluate(() => {
      const body = document.querySelector(".workout-card-body");
      if (!body) return 0;
      return body.getBoundingClientRect().height / window.innerHeight;
    });
    expect(ratio, "corpo do workout ocupa pouco da tela").toBeGreaterThan(0.5);
  });

  test("a barra de navegação do treino está acessível", async ({ page }) => {
    // Regressão real: a barra de status cobria este controle no PWA e não havia
    // como voltar. Aqui garantimos ao menos que ele não nasce fora da tela.
    const back = page.getByRole("button", { name: /voltar para a sequência/i });
    await expect(back).toBeVisible();
    const box = await back.boundingBox();
    expect(box!.y, "botão voltar acima do topo da tela").toBeGreaterThanOrEqual(0);
  });

  test("cada exercício oferece timer e demonstração alinhados", async ({ page }) => {
    const rows = page.locator(".workout-exercise-row");
    expect(await rows.count()).toBeGreaterThan(0);

    // Alinhamento: as ações precisam começar na mesma coluna em todas as linhas,
    // que foi exatamente a queixa sobre o "Ver" dançando de linha para linha.
    const lefts = await page.locator(".workout-exercise-demo").evaluateAll(nodes =>
      nodes.map(node => Math.round(node.getBoundingClientRect().left))
    );
    expect(new Set(lefts).size, `posições distintas do botão Ver: ${lefts.join(", ")}`).toBe(1);
  });
});

test.describe("PWA", () => {
  test("serve manifest, ícones e service worker", async ({ page, request }) => {
    await stubApi(page);
    await page.goto("/");

    for (const path of ["/manifest.webmanifest", "/sw.js", "/icons/apple-touch-icon.png"]) {
      const response = await request.get(path);
      expect(response.status(), `${path} indisponível`).toBe(200);
    }

    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  test("declara as metas que o iOS exige para rodar em tela cheia", async ({ page }) => {
    await stubApi(page);
    await page.goto("/");
    // O iOS ignora o manifest para isto; quem manda são estas metas.
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  });
});

test.describe("lista de workouts", () => {
  test.beforeEach(async ({ page }) => {
    await stubApi(page);
    await page.goto("/");
    await page.getByRole("tab", { name: "Sequência" }).click();
  });

  test("o nome do WOD não é truncado", async ({ page }) => {
    // Queixa real do iPhone: o título dividia a largura com os botões e ficava
    // cortado, sem forma alguma de ler o nome completo.
    const truncated = await page.locator(".workout-row-title p").first().evaluate(node => ({
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
    }));
    expect(truncated.scrollWidth, "título cortado na horizontal").toBeLessThanOrEqual(
      truncated.clientWidth + 1
    );
  });

  test("as ações ficam numa linha própria, abaixo do nome e centradas", async ({ page }) => {
    const title = await page.locator(".workout-row-title").first().boundingBox();
    const actions = await page.locator(".workout-row-title").first()
      .locator("xpath=../following-sibling::div").first().boundingBox();

    expect(actions!.y, "ações não estão abaixo do nome").toBeGreaterThanOrEqual(title!.y + title!.height - 1);

    const cardCentre = await page.locator("[data-slot='card-content']").first().evaluate(node => {
      const box = node.getBoundingClientRect();
      return box.left + box.width / 2;
    });
    const actionsCentre = actions!.x + actions!.width / 2;
    expect(Math.abs(actionsCentre - cardCentre), "linha de ações fora do centro").toBeLessThan(12);
  });
});
