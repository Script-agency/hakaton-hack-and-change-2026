import type { Variants } from "framer-motion";

export const panelVariants: Variants = {
  open: { opacity: 1, scale: 1, y: 0, visibility: "visible" },
  closed: { opacity: 0, scale: 0.96, y: 16, transitionEnd: { visibility: "hidden" } },
};
