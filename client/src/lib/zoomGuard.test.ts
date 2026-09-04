import { describe, expect, it, vi } from "vitest";
import { installZoomGuard, isPinchTouchMove } from "./zoomGuard";

function fakeTarget() {
  const listeners = new Map<string, Array<(event: Event) => void>>();
  return {
    listeners,
    addEventListener(type: string, listener: (event: Event) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener(type: string, listener: (event: Event) => void) {
      listeners.set(type, (listeners.get(type) ?? []).filter(item => item !== listener));
    },
    dispatch(type: string, event: Record<string, unknown> = {}) {
      const preventDefault = vi.fn();
      for (const listener of listeners.get(type) ?? []) listener({ preventDefault, ...event } as unknown as Event);
      return preventDefault;
    },
  };
}

describe("guarda de zoom", () => {
  it("reconhece a pinça pelo scale do Safari ou por dois dedos", () => {
    expect(isPinchTouchMove({ scale: 1.2 })).toBe(true);
    expect(isPinchTouchMove({ scale: 0.8 })).toBe(true);
    expect(isPinchTouchMove({ touches: { length: 2 } })).toBe(true);
    // Um dedo e escala 1 é rolagem normal: não pode ser bloqueada.
    expect(isPinchTouchMove({ scale: 1, touches: { length: 1 } })).toBe(false);
    expect(isPinchTouchMove({})).toBe(false);
  });

  it("bloqueia os eventos de gesto do Safari e a pinça no touchmove", () => {
    const target = fakeTarget();
    installZoomGuard(target, () => {});
    expect(target.dispatch("gesturestart")).toHaveBeenCalled();
    expect(target.dispatch("gesturechange")).toHaveBeenCalled();
    expect(target.dispatch("touchmove", { scale: 1.5 })).toHaveBeenCalled();
    expect(target.dispatch("touchmove", { scale: 1, touches: { length: 1 } })).not.toHaveBeenCalled();
  });

  it("recentraliza ao instalar e sempre que a aba volta ao primeiro plano", () => {
    const target = fakeTarget();
    const recenter = vi.fn();
    installZoomGuard(target, recenter);
    expect(recenter).toHaveBeenCalledTimes(1);
    target.dispatch("pageshow");
    target.dispatch("visibilitychange");
    expect(recenter).toHaveBeenCalledTimes(3);
  });

  it("remove tudo ao desinstalar", () => {
    const target = fakeTarget();
    const uninstall = installZoomGuard(target, () => {});
    uninstall();
    expect(target.dispatch("gesturestart")).not.toHaveBeenCalled();
    expect(target.dispatch("touchmove", { scale: 2 })).not.toHaveBeenCalled();
  });
});
