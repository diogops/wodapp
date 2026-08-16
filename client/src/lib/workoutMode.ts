export const WORKOUT_MODE_CLASS = "workout-mode";
export const WORKOUT_DEMO_MODAL_CLASS = "fixed inset-0 z-[70]";

export function getWorkoutDemoState(open: boolean) {
  return {
    open,
    modalClass: open ? WORKOUT_DEMO_MODAL_CLASS : "hidden",
    globalScroll: "locked" as const,
  };
}

export function getWorkoutShellClass(tab: "today" | "library" | "history") {
  return tab === "today" ? WORKOUT_MODE_CLASS : "";
}
