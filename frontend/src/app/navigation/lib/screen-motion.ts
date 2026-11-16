import type { TargetAndTransition, Transition } from "framer-motion";

import type { ScreenDirection } from "../types";

export const getScreenInitial = (
  animateEnter: boolean,
  reducedMotion: boolean,
  direction: ScreenDirection = "right"
): false | { x: string } | { y: string } => {
  if (!animateEnter || reducedMotion) {
    return false;
  }

  return direction === "bottom" ? { y: "100%" } : { x: "100%" };
};

export const getScreenTransition = (animate: boolean): Transition =>
  animate ? { duration: 0.25, ease: [0.22, 1, 0.36, 1] } : { duration: 0 };

export const getScreenExit = (
  animateExit: boolean,
  reducedMotion: boolean,
  direction: ScreenDirection = "right"
): TargetAndTransition => {
  const animate = animateExit && !reducedMotion;
  const offset = animate ? "100%" : 0;
  const position = direction === "bottom" ? { y: offset } : { x: offset };

  return { ...position, transition: getScreenTransition(animate) };
};
