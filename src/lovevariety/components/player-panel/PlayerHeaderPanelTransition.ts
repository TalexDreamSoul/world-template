import type { TransitionPlugin } from "../common/animations/AutoTransition";

export const FloatingPlayerPanelTransition: TransitionPlugin = {
  enter(el) {
    return el.animate(
      [
        { opacity: 0, transform: "translateY(-10px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 200,
        easing: "ease-out",
        fill: "forwards",
      },
    );
  },
  exit(el) {
    return el.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-10px)" },
      ],
      {
        duration: 200,
        easing: "ease-in",
        fill: "forwards",
      },
    );
  },
};
