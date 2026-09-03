import { describe, expect, it } from "vitest";
import { isTextEntryElement, shouldResetWindowScroll } from "./viewportLock";

const element = (tagName: string, extra: Record<string, unknown> = {}) =>
  ({ tagName, ...extra }) as unknown as Element;

describe("trava de viewport do modo de treino", () => {
  it("reconhece o que recebe teclado", () => {
    expect(isTextEntryElement(element("INPUT"))).toBe(true);
    expect(isTextEntryElement(element("TEXTAREA"))).toBe(true);
    expect(isTextEntryElement(element("SELECT"))).toBe(true);
    expect(isTextEntryElement(element("DIV", { isContentEditable: true }))).toBe(true);
    expect(isTextEntryElement(element("BUTTON"))).toBe(false);
    expect(isTextEntryElement(element("BODY"))).toBe(false);
    expect(isTextEntryElement(null)).toBe(false);
  });

  it("volta a janela para o topo quando o iOS a deslocou e nada está em edição", () => {
    // O cenário da captura: teclado fechado, página ainda 100px acima.
    expect(shouldResetWindowScroll({ activeElement: element("BODY"), scrollX: 0, scrollY: 100 })).toBe(true);
    expect(shouldResetWindowScroll({ activeElement: null, scrollX: 12, scrollY: 0 })).toBe(true);
  });

  it("não mexe enquanto um campo tem foco, senão ele some sob o teclado", () => {
    expect(shouldResetWindowScroll({ activeElement: element("INPUT"), scrollX: 0, scrollY: 100 })).toBe(false);
  });

  it("não faz nada quando já está no lugar", () => {
    expect(shouldResetWindowScroll({ activeElement: element("BODY"), scrollX: 0, scrollY: 0 })).toBe(false);
  });
});
