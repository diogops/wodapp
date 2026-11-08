import { expect, test } from "@playwright/test";
import { fixtures, stubApi } from "./fixtures";

/** Link do vídeo no modal e fecho da sessão precisam caber na menor tela. */
const today = new Date().getDay();
const workout = {
  ...fixtures.workouts[0],
  id: 9,
  modalityId: 2,
  title: "Power Clean S1 · A — Técnica e recepção",
  sections: [
    {
      id: 90, workoutId: 9, title: "Técnica", format: "Power Clean", kind: "straight_sets", notes: null, orderIndex: 0,
      exercises: [
        { id: 900, sectionId: 90, name: "Tall Power Clean", prescription: "5 × 3 · descanso 60 s", sets: "5", reps: "3", duration: null, load: "PVC/barra", notes: "Entrada rápida sob a barra e recepção simétrica: os dois pés alinhados, sem avançar uma perna.", imageUrl: "/demos/lpo-tall-power-clean-fases.jpg", videoUrl: "https://www.youtube.com/results?search_query=tall+power+clean+drill", orderIndex: 0 },
      ],
    },
  ],
};
const modality = (id: number, slug: string, grammar: object) => ({ id, userId: 1, slug, name: slug, color: "#5b7a3f", icon: "Anvil", grammar: JSON.stringify(grammar), builtIn: true, archived: false, orderIndex: id, createdAt: "2026-08-01T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await stubApi(page, {
    "workouts.modalities": [modality(1, "crossfit", {}), modality(2, "fortalecimento", { trackedMetrics: ["load"], sessionReviewHint: "Recepção com os pés paralelos?" })],
    "workouts.list": [workout],
    "workouts.lastLoads": {},
    "schedule.list": [{ id: 1, userId: 1, modalityId: 2, weekdays: [today], startTime: null, durationMinutes: 35, preferredWorkoutId: null, enabled: true, createdAt: "2026-08-01T10:00:00.000Z" }],
  });
  await page.goto("/");
  await expect(page.getByText("Tall Power Clean", { exact: true })).toBeVisible();
});

test("o modal mostra imagem e link do vídeo dentro da tela", async ({ page }) => {
  await page.getByRole("button", { name: "Ver demonstração de Tall Power Clean" }).click();
  const link = page.getByRole("link", { name: "Ver vídeo" });
  await expect(link).toHaveAttribute("href", /tall\+power\+clean/);
  await expect(link).toHaveAttribute("target", "_blank");
  const box = (await link.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(568);
  const image = (await page.getByAltText("Demonstração de Tall Power Clean").boundingBox())!;
  expect(image.height, "imagem espremida pelo texto").toBeGreaterThan(150);
});

test("concluir pede RPE e observações antes de registrar", async ({ page }) => {
  const sent = page.waitForRequest(request => request.url().includes("workouts.session"));
  await page.locator(".workout-card-actions").getByRole("button", { name: /concluir/i }).click();
  const dialog = page.getByRole("dialog", { name: "Como foi a sessão" });
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(568);
  await dialog.getByRole("button", { name: "7", exact: true }).click();
  await dialog.getByLabel("Observações").fill("Recebi em split na última série");
  await dialog.getByRole("button", { name: "Concluir" }).click();
  const body = (await sent).postData() ?? "";
  expect(body).toContain('"rpe":7');
  expect(body).toContain("Recebi em split");
  await expect(dialog).toBeHidden();
});
