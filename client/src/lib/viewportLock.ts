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

export function shouldResetWindowScroll(state: {
  activeElement: Element | null | undefined;
  scrollX: number;
  scrollY: number;
}): boolean {
  if (isTextEntryElement(state.activeElement)) return false;
  return state.scrollX !== 0 || state.scrollY !== 0;
}

export function useViewportLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const reset = () => {
      if (shouldResetWindowScroll({ activeElement: document.activeElement, scrollX: window.scrollX, scrollY: window.scrollY })) {
        window.scrollTo(0, 0);
      }
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
    reset();

    return () => {
      timers.forEach(id => window.clearTimeout(id));
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", reset);
      window.visualViewport?.removeEventListener("resize", reset);
    };
  }, [active]);
}
