import { describe, expect, it } from "vitest";
import { LOAD_STEP_KG, adjustLoad, advanceSet, parseRestSeconds, parseSetPlan } from "./straightSets";

describe("parseSetPlan", () => {
  it("lê séries e reps de campos separados", () => {
    expect(parseSetPlan({ sets: "4", reps: "8-12" })).toMatchObject({ total: 4, reps: "8-12" });
  });

  it("lê '4x10' e '4 séries de 8' da prescrição", () => {
    expect(parseSetPlan({ prescription: "4x10 a 70%" })).toMatchObject({ total: 4, reps: "10" });
    expect(parseSetPlan({ prescription: "4 x 10-12" })).toMatchObject({ total: 4, reps: "10-12" });
    expect(parseSetPlan({ prescription: "3 séries de 8" })).toMatchObject({ total: 3, reps: "8" });
  });

  it("é null sem número de séries, em vez de inventar", () => {
    // Inventar faria o app cobrar séries que o treino não pediu.
    expect(parseSetPlan({ prescription: "até a falha" })).toBeNull();
    expect(parseSetPlan({})).toBeNull();
    expect(parseSetPlan({ reps: "10" })).toBeNull();
  });

  it("usa o descanso da prescrição e cai no default quando não há", () => {
    expect(parseSetPlan({ sets: "4", prescription: "4x8, descanso 2min" })!.restSeconds).toBe(120);
    expect(parseSetPlan({ sets: "4" })!.restSeconds).toBe(90);
    expect(parseSetPlan({ sets: "4" }, 60)!.restSeconds).toBe(60);
  });
});

describe("parseRestSeconds", () => {
  it("entende minutos e segundos, escritos de várias formas", () => {
    expect(parseRestSeconds("descanso 90s")).toBe(90);
    expect(parseRestSeconds("descanso 2 min")).toBe(120);
    expect(parseRestSeconds("rest 1.5min")).toBe(90);
    expect(parseRestSeconds("pausa 45 seg")).toBe(45);
  });

  it("ignora números que não são descanso", () => {
    expect(parseRestSeconds("4x10 a 70%")).toBeNull();
    expect(parseRestSeconds(null)).toBeNull();
  });
});

describe("adjustLoad", () => {
  it("preserva o formato do texto ao somar ou subtrair", () => {
    expect(adjustLoad("60 kg", LOAD_STEP_KG)).toBe("62.5 kg");
    expect(adjustLoad("62.5 kg", -LOAD_STEP_KG)).toBe("60 kg");
    expect(adjustLoad("20kg", 5)).toBe("25kg");
  });

  it("aceita vírgula decimal", () => {
    expect(adjustLoad("62,5 kg", LOAD_STEP_KG)).toBe("65 kg");
  });

  it("não deixa a carga ficar negativa", () => {
    expect(adjustLoad("2 kg", -10)).toBe("0 kg");
  });

  it("não mexe em carga não numérica", () => {
    // "corpo livre" e "faixa" são cargas válidas que não se incrementam.
    expect(adjustLoad("corpo livre", LOAD_STEP_KG)).toBe("corpo livre");
    expect(adjustLoad("faixa vermelha", -LOAD_STEP_KG)).toBe("faixa vermelha");
  });

  it("parte do zero quando não havia carga", () => {
    expect(adjustLoad(null, LOAD_STEP_KG)).toBe("2.5 kg");
  });
});

describe("advanceSet", () => {
  it("avança e sinaliza o fim do bloco", () => {
    const plan = { total: 3, reps: "10", restSeconds: 90 };
    expect(advanceSet(0, plan)).toEqual({ nextIndex: 1, finished: false });
    expect(advanceSet(1, plan)).toEqual({ nextIndex: 2, finished: false });
    // A última série concluída encerra o bloco — é o que evita oferecer
    // descanso depois da série final.
    expect(advanceSet(2, plan)).toEqual({ nextIndex: 3, finished: true });
  });
});
