export const WORKOUT_MODE_CLASS = "workout-mode";
export const WORKOUT_DEMO_MODAL_CLASS = "fixed inset-0 z-[70]";

export function getWorkoutDemoState(open: boolean) {
  return {
    open,
    modalClass: open ? WORKOUT_DEMO_MODAL_CLASS : "hidden",
    globalScroll: "locked" as const,
  };
}

/**
 * `settled` é o "já assentou no topo": a trava só entra depois que a janela
 * foi levada a 0,0 numa página ainda rolável. Travar com um deslocamento
 * residual do Safari é o que cortava o cabeçalho ao abrir direto no treino.
 */
export function isWorkoutLocked(tab: "today" | "library" | "history", settled = true) {
  return tab === "today" && settled;
}

export function getWorkoutShellClass(tab: "today" | "library" | "history", settled = true) {
  return isWorkoutLocked(tab, settled) ? WORKOUT_MODE_CLASS : "";
}
