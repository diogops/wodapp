/**
 * Guarda contra zoom e deslocamento no celular.
 *
 * O iOS ignora `maximum-scale` e `user-scalable=no` desde o iOS 10: pinça e
 * toque duplo ampliam a página, ela fica maior que a tela e o Safari passa a
 * deixar arrastar em qualquer direção — o cabeçalho "sai do enquadramento" e
 * o app perde cara de app. O CSS (`touch-action: pan-y`) resolve a maior
 * parte; isto aqui cobre o que ele não cobre: os eventos proprietários de
 * gesto do Safari e o `touchmove` com dois dedos.
 */

type TouchMoveLike = {
  touches?: { length: number };
  /** Só o Safari expõe; > 1 ou < 1 é pinça em andamento. */
  scale?: number;
};

export function isPinchTouchMove(event: TouchMoveLike): boolean {
  if (typeof event.scale === "number" && event.scale !== 1) return true;
  return (event.touches?.length ?? 0) > 1;
}

type Listener = (event: Event) => void;
type Target = {
  addEventListener: (type: string, listener: Listener, options?: AddEventListenerOptions | boolean) => void;
  removeEventListener: (type: string, listener: Listener, options?: EventListenerOptions | boolean) => void;
};

const GESTURE_EVENTS = ["gesturestart", "gesturechange", "gestureend"];

/**
 * Instala os bloqueios. Devolve a função que os remove, para o teste e para
 * quem um dia precisar desligar. `recenter` roda quando a aba volta ao
 * primeiro plano: o Safari guarda o deslocamento horizontal entre visitas.
 */
export function installZoomGuard(
  target: Target,
  recenter: () => void = () => {
    if (typeof window !== "undefined" && window.scrollX !== 0) window.scrollTo(0, window.scrollY);
  }
): () => void {
  const block: Listener = event => event.preventDefault();
  const onTouchMove: Listener = event => {
    if (isPinchTouchMove(event as unknown as TouchMoveLike)) event.preventDefault();
  };
  const onShow: Listener = () => recenter();

  for (const type of GESTURE_EVENTS) target.addEventListener(type, block, { passive: false });
  target.addEventListener("touchmove", onTouchMove, { passive: false });
  target.addEventListener("pageshow", onShow);
  target.addEventListener("visibilitychange", onShow);
  recenter();

  return () => {
    for (const type of GESTURE_EVENTS) target.removeEventListener(type, block);
    target.removeEventListener("touchmove", onTouchMove);
    target.removeEventListener("pageshow", onShow);
    target.removeEventListener("visibilitychange", onShow);
  };
}
