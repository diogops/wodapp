import { describe, expect, it } from "vitest";
import { DEFAULT_GENERATOR_MODALITY, buildGeneratorSystemPrompt } from "./generatorPrompt";
import { BUILT_IN_MODALITIES } from "./modalities";

const bySlug = (slug: string) => {
  const seed = BUILT_IN_MODALITIES.find(modality => modality.slug === slug)!;
  return { name: seed.name, grammar: seed.grammar };
};

describe("buildGeneratorSystemPrompt", () => {
  it("mantém CrossFit como padrão, com o vocabulário e as regras de formato", () => {
    const prompt = buildGeneratorSystemPrompt();
    expect(prompt).toContain("treinador de CrossFit");
    expect(prompt).toContain("WOD");
    expect(prompt).toContain("AMRAP");
    expect(prompt).toContain("kg");
    // As regras de renderização não podem sumir: são elas que impedem o
    // treino de voltar como parágrafo de texto corrido.
    expect(prompt).toContain("Cada movimento é um item separado em `exercises`");
    expect(prompt).toContain("no máximo cerca de 60 caracteres");
  });

  it("o default é o CrossFit explícito", () => {
    expect(buildGeneratorSystemPrompt(DEFAULT_GENERATOR_MODALITY)).toBe(buildGeneratorSystemPrompt());
  });

  it("musculação não recebe blocos de CrossFit e ganha descanso", () => {
    const prompt = buildGeneratorSystemPrompt(bySlug("strength"));
    expect(prompt).toContain("treinador de Musculação");
    expect(prompt).toContain("Série");
    expect(prompt).toContain("descanso entre séries");
    expect(prompt).not.toContain("AMRAP");
    expect(prompt).not.toContain("EMOM");
  });

  it("calistenia troca carga externa por progressão", () => {
    const prompt = buildGeneratorSystemPrompt(bySlug("calisthenics"));
    expect(prompt).toContain("peso corporal");
    expect(prompt).not.toContain("Use kg para carga");
  });

  it("corrida usa distância e não fala de carga", () => {
    const prompt = buildGeneratorSystemPrompt(bySlug("endurance"));
    expect(prompt).toContain("distância");
    expect(prompt).toContain("`load` vazio");
    expect(prompt).not.toContain("Tabata");
  });

  it("toda modalidade embutida gera um prompt com as regras de formato", () => {
    for (const seed of BUILT_IN_MODALITIES) {
      const prompt = buildGeneratorSystemPrompt({ name: seed.name, grammar: seed.grammar });
      expect(prompt).toContain(`treinador de ${seed.name}`);
      expect(prompt).toContain("FORMATO");
    }
  });
});
