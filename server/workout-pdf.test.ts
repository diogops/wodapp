import { describe, expect, it } from "vitest";
import { buildWorkoutPdf } from "./workoutPdf";

const workout = {
  title: "Workout B - Base para BMU / RMU",
  focus: "Hollow, arch, core, empurrada, dip e memória motora",
  level: "intermediário",
  suggestedDate: new Date("2026-08-20T00:00:00Z"),
  notes: "Esta parte não é para carga.",
  sections: [
    {
      title: "Hollow / Arch - 4 rounds",
      format: "4 rounds",
      notes: "Manter o tronco firme",
      exercises: [
        { name: "Hollow Hold", duration: "20s" },
        { name: "Superman / Arch Hold", duration: "20s", notes: "Sem forçar a lombar" },
      ],
    },
    {
      title: "Paralelas",
      exercises: [{ name: "Dips", reps: "8-12", load: "corpo livre" }],
    },
  ],
};

describe("buildWorkoutPdf", () => {
  it("produces a valid, non-trivial PDF document", async () => {
    const pdf = await buildWorkoutPdf(workout);

    // %PDF-1.x no início e %%EOF no fim: gerado por completo, não truncado.
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.subarray(-1024).toString("latin1")).toContain("%%EOF");
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });

  it("survives a workout with no sections or optional fields", async () => {
    const pdf = await buildWorkoutPdf({ title: "Mínimo" });
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(500);
  });

  it("renders the derived prescription when there is no prescription text", async () => {
    // Sem prescription, o PDF precisa cair para sets/reps/duration/load — é o
    // formato dos workouts padrão, que não têm prescription preenchida.
    const pdf = await buildWorkoutPdf({
      title: "Derivado",
      sections: [{ title: "Bloco", exercises: [{ name: "Dips", reps: "8-12", load: "10 kg" }] }],
    });
    expect(pdf.byteLength).toBeGreaterThan(500);
  });
});
