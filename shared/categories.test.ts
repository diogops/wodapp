import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORY, WORKOUT_CATEGORIES, isWorkoutCategory } from "./categories";

describe("categorias de workout", () => {
  it("expõe os cinco níveis na ordem de progressão", () => {
    expect([...WORKOUT_CATEGORIES]).toEqual([
      "Iniciante",
      "Intermediário",
      "Avançado",
      "Pro",
      "Elite",
    ]);
  });

  it("rejeita texto fora da lista", () => {
    // O filtro do dashboard compara valores exatos: aceitar texto livre aqui
    // faria o workout sumir da fila sem erro nenhum.
    expect(isWorkoutCategory("Elite")).toBe(true);
    expect(isWorkoutCategory("elite")).toBe(false);
    expect(isWorkoutCategory("Semi-pro")).toBe(false);
    expect(isWorkoutCategory("")).toBe(false);
  });

  it("tem um default que pertence à lista", () => {
    expect(isWorkoutCategory(DEFAULT_CATEGORY)).toBe(true);
  });
});
