import { describe, expect, it } from "vitest";
import { workoutSchema } from "./routers";

describe("workoutSchema", () => {
  it("accepts a structured workout with sections and prescriptions", () => {
    const parsed = workoutSchema.parse({
      title: "Engine / Base aeróbica",
      focus: "Construir motor sem transformar tudo em WOD",
      level: "intermediário",
      sections: [{
        title: "Cardio - 30 min",
        format: "steady",
        exercises: [{ name: "Corrida", prescription: "5 min leve; 20 min ritmo constante; 5 min leve", duration: "30 min", notes: "Respiração controlada" }],
      }],
    });
    expect(parsed.title).toBe("Engine / Base aeróbica");
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0]?.exercises[0]?.duration).toBe("30 min");
  });

  it("preserves PDF source metadata when the reviewed import is confirmed", () => {
    const parsed = workoutSchema.parse({
      title: "Workout importado",
      sourceFileKey: "12-workouts/source.pdf",
      sourceFileName: "source.pdf",
      sections: [],
    });
    expect(parsed.sourceFileKey).toContain("source.pdf");
    expect(parsed.sourceFileName).toBe("source.pdf");
  });

  it("rejects a workout without a title", () => {
    expect(() => workoutSchema.parse({ sections: [] })).toThrow();
  });

  it("rejects malformed exercise sections", () => {
    expect(() => workoutSchema.parse({
      title: "Inválido",
      sections: [{ title: "Força", exercises: [{ name: 42 }] }],
    })).toThrow();
  });
});
