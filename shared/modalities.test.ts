import { describe, expect, it } from "vitest";
import {
  BUILT_IN_MODALITIES,
  CROSSFIT_GRAMMAR,
  DEFAULT_MODALITY_SLUG,
  inferBlockKind,
  isBlockKind,
  isMetricKey,
} from "./modalities";

describe("modalidades embutidas", () => {
  it("tem CrossFit como padrão e primeira da lista", () => {
    // Regressão zero para quem já usa: a modalidade dos dados antigos.
    expect(BUILT_IN_MODALITIES[0].slug).toBe(DEFAULT_MODALITY_SLUG);
  });

  it("declara gramáticas internamente coerentes", () => {
    for (const modality of BUILT_IN_MODALITIES) {
      expect(modality.grammar.allowedBlockKinds.length, modality.slug).toBeGreaterThan(0);
      expect(modality.grammar.trackedMetrics.length, modality.slug).toBeGreaterThan(0);
      for (const kind of modality.grammar.allowedBlockKinds) {
        expect(isBlockKind(kind), `${modality.slug}: ${kind}`).toBe(true);
      }
      for (const metric of modality.grammar.trackedMetrics) {
        expect(isMetricKey(metric), `${modality.slug}: ${metric}`).toBe(true);
      }
    }
  });

  it("dá vocabulário próprio a cada modalidade", () => {
    // O ponto da gramática: a tela não pode dizer "WOD" em musculação.
    const strength = BUILT_IN_MODALITIES.find(m => m.slug === "strength")!;
    expect(strength.grammar.labels.workout).toBe("Treino");
    expect(strength.grammar.labels.unitOfWork).toBe("Série");
    expect(CROSSFIT_GRAMMAR.labels.workout).toBe("WOD");
  });

  it("marca descanso como primeira classe só onde ele é", () => {
    const byslug = Object.fromEntries(BUILT_IN_MODALITIES.map(m => [m.slug, m.grammar]));
    expect(byslug.strength.restIsFirstClass).toBe(true);
    expect(byslug.calisthenics.restIsFirstClass).toBe(true);
    // Em CrossFit o cronômetro global manda; descanso entre séries não é o eixo.
    expect(byslug.crossfit.restIsFirstClass).toBe(false);
  });

  it("usa slugs únicos", () => {
    const slugs = BUILT_IN_MODALITIES.map(m => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("inferBlockKind", () => {
  it("reconhece os formatos dos workouts que já existem", () => {
    // Estes são os `format` reais dos quatro WODs semeados.
    expect(inferBlockKind("AMRAP 15")).toBe("amrap");
    expect(inferBlockKind("EMOM")).toBe("emom");
    expect(inferBlockKind("EMOM 20")).toBe("emom");
    expect(inferBlockKind("3 rounds")).toBe("circuit");
    expect(inferBlockKind("8 rounds")).toBe("circuit");
  });

  it("usa o título quando o formato não diz nada", () => {
    expect(inferBlockKind("", "Técnica - 12 min")).toBe("skill");
    expect(inferBlockKind(null, "Aquecimento geral")).toBe("warmup");
    expect(inferBlockKind(null, "Hollow Hold")).toBe("hold");
  });

  it("reconhece séries de musculação", () => {
    expect(inferBlockKind("4 x 10")).toBe("straight_sets");
    expect(inferBlockKind("séries")).toBe("straight_sets");
    expect(inferBlockKind("superset")).toBe("superset");
  });

  it("devolve null quando não há sinal, em vez de chutar", () => {
    // Chutar um kind mudaria como o bloco é cronometrado no treino.
    expect(inferBlockKind(null, null)).toBeNull();
    expect(inferBlockKind("", "")).toBeNull();
    expect(inferBlockKind("steady", "Cardio")).toBeNull();
  });
});
