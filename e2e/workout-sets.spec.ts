import { expect, test } from "@playwright/test";
import { fixtures, stubApi } from "./fixtures";

/**
 * Bloco de séries (`straight_sets`) usa a mesma linha de exercício que os
 * outros blocos. Antes ele era desenhado só pelo SetTracker: card diferente e
 * sem "Ver demonstração" (o caso do Bulgarian split squat).
 */
const strength = {
  ...fixtures.workouts[0],
  id: 9,
  title: "S1 · Ter — Clean e front rack · quadríceps",
  sections: [
    {
      id: 90, workoutId: 9, title: "Front squat", format: "5 × 5", kind: "straight_sets", notes: null, orderIndex: 0,
      exercises: [{ id: 901, sectionId: 90, name: "Front squat", prescription: "5 × 5 · RPE 6, desc. 120 s", sets: "5", reps: "5", duration: null, load: "RPE 6", notes: null, imageUrl: "/demos/musculacao-front-squat-fases.jpg", orderIndex: 0 }],
    },
    {
      id: 91, workoutId: 9, title: "Bulgarian split squat", format: "3 × 8/lado", kind: "straight_sets", notes: null, orderIndex: 1,
      exercises: [{ id: 911, sectionId: 91, name: "Bulgarian split squat", prescription: "3 × 8/lado · RPE 3–5, desc. 45 s", sets: "3", reps: "8/lado", duration: null, load: "RPE 3–5", notes: null, imageUrl: "/demos/musculacao-bulgarian-split-squat-fases.jpg", orderIndex: 0 }],
    },
    {
      id: 92, workoutId: 9, title: "Spanish squat isometric", format: "3 × 30 s", kind: "hold", notes: null, orderIndex: 2,
      exercises: [{ id: 921, sectionId: 92, name: "Spanish squat isometric", prescription: "3 × 30 s · RPE 6, desc. 90 s", sets: "3", reps: null, duration: "30 s", load: "RPE 6", notes: null, imageUrl: "/demos/musculacao-spanish-squat-isometric-fases.jpg", orderIndex: 0 }],
    },
  ],
};

test("bloco de séries tem a mesma linha de exercício, com demonstração", async ({ page }) => {
  await stubApi(page, { "workouts.list": [strength], "workouts.lastLoads": {} });
  await page.goto("/");
  await expect(page.locator(".workout-card-body")).toBeVisible();

  const rows = page.locator(".workout-exercise-row");
  await expect(rows).toHaveCount(3);
  for (const name of ["Front squat", "Bulgarian split squat", "Spanish squat isometric"]) {
    await expect(page.getByRole("button", { name: `Ver demonstração de ${name}` })).toBeVisible();
  }
  // O registro de séries continua lá, dentro da linha, e a carga não vem
  // preenchida com o alvo de RPE.
  const load = page.getByLabel("Carga de Bulgarian split squat");
  await expect(load).toHaveValue("");
  await expect(load).toHaveAttribute("placeholder", "RPE 3–5");

  await page.getByRole("button", { name: "Ver demonstração de Bulgarian split squat" }).click();
  await expect(page.getByAltText("Demonstração de Bulgarian split squat")).toBeVisible();
});

test("nenhuma linha de exercício vaza da sua seção na tela pequena", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await stubApi(page, { "workouts.list": [strength], "workouts.lastLoads": {} });
  await page.goto("/");
  await expect(page.locator(".workout-card-body")).toBeVisible();
  const overflow = await page.locator(".workout-exercise-row").evaluateAll(rows =>
    rows
      .map(row => ({ row: row.getBoundingClientRect(), section: row.closest("section")!.getBoundingClientRect(), name: row.querySelector("p")?.textContent }))
      .filter(({ row, section }) => row.top < section.top - 1 || row.bottom > section.bottom + 1)
      .map(({ name }) => name)
  );
  expect(overflow, "linhas maiores que a seção").toEqual([]);
});
