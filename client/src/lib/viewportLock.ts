import { useEffect } from "react";

/**
 * Trava de viewport do modo de treino.
 *
 * `overflow: hidden` em html/body impede o dedo de rolar a página, mas não
 * impede o iOS Safari de rolá-la sozinho: ao focar um input perto do rodapé
 * (a carga do SetTracker), ele empurra a janela para cima para o campo sair
 * de baixo do teclado — e, quando o teclado fecha, o deslocamento fica. O
 * resultado é o cabeçalho cortado no topo e uma faixa morta embaixo.
 *
 * A regra: sempre que nada estiver sendo digitado, a janela volta para 0,0.
 * Enquanto um campo tem foco não se mexe, senão o campo some sob o teclado.
 */
export function isTextEntryElement(element: Element | null | undefined): boolean {
  if (!element) return false;
  const tag = element.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return (element as HTMLElement).isContentEditable === true;
}

/**
 * Limiar de 1px: em telas com pixel ratio 3 o WebKit devolve `scrollY`
 * fracionário depois de um `scrollTo(0, 0)`, e tratar 0,33 como "deslocado"
 * fazia reset → evento de scroll → reset, sem fim.
 */
export const SCROLL_RESET_THRESHOLD_PX = 1;

/** Resets seguidos dentro desta janela contam como loop e param. */
export const RESET_BURST_WINDOW_MS = 250;
export const RESET_BURST_LIMIT = 6;

export function shouldResetWindowScroll(state: {
  activeElement: Element | null | undefined;
  scrollX: number;
  scrollY: number;
}): boolean {
  if (isTextEntryElement(state.activeElement)) return false;
  return (
    Math.abs(state.scrollX) >= SCROLL_RESET_THRESHOLD_PX ||
    Math.abs(state.scrollY) >= SCROLL_RESET_THRESHOLD_PX
  );
}

/**
 * Disjuntor: devolve `true` enquanto os resets estão em ritmo normal e
 * `false` quando viraram rajada (um sinal de que `scrollTo` não está
 * conseguindo zerar a janela e cada tentativa dispara outra). Reinicia
 * sozinho quando a rajada cessa.
 */
export function createResetBreaker(now: () => number = () => Date.now()) {
  let burstStart = 0;
  let count = 0;
  return () => {
    const at = now();
    if (at - burstStart > RESET_BURST_WINDOW_MS) {
      burstStart = at;
      count = 0;
    }
    count += 1;
    return count <= RESET_BURST_LIMIT;
  };
}

export function useViewportLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const allowed = createResetBreaker();
    const reset = () => {
      if (!shouldResetWindowScroll({ activeElement: document.activeElement, scrollX: window.scrollX, scrollY: window.scrollY })) return;
      if (!allowed()) return;
      window.scrollTo(0, 0);
    };
    // Duas tentativas depois do blur: uma imediata e outra depois da animação
    // do teclado, que é quando o Safari termina de reposicionar a página.
    const timers: number[] = [];
    const onFocusOut = () => {
      timers.push(window.setTimeout(reset, 50), window.setTimeout(reset, 400));
    };

    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", reset, { passive: true });
    window.visualViewport?.addEventListener("resize", reset);
    // `scroll` do visualViewport: dispara quando o iOS desloca a área visível
    // sem rolar a janela, que é o caso do deslocamento residual.
    window.visualViewport?.addEventListener("scroll", reset);
    reset();

    return () => {
      timers.forEach(id => window.clearTimeout(id));
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", reset);
      window.visualViewport?.removeEventListener("resize", reset);
      window.visualViewport?.removeEventListener("scroll", reset);
    };
  }, [active]);
}
