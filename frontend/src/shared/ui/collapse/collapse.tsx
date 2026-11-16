import type { PropsWithChildren } from "react";
import clsx from "clsx";
import { AnimatePresence, useIsPresent, useReducedMotion } from "framer-motion";
import * as m from "framer-motion/m";

import styles from "./collapse.module.scss";

interface CollapseProps extends PropsWithChildren {
  isOpen: boolean;
  className?: string;
}

const CollapseContent = ({ children, className }: PropsWithChildren<{ className?: string }>) => {
  const isPresent = useIsPresent();
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      animate={{ height: "auto", opacity: 1 }}
      aria-hidden={!isPresent}
      className={clsx(styles.collapse, className)}
      exit={{ height: 0, opacity: 0 }}
      inert={!isPresent}
      initial={{ height: 0, opacity: 0 }}
      transition={shouldReduceMotion === true ? { duration: 0 } : undefined}
    >
      {children}
    </m.div>
  );
};

export const Collapse = ({ children, className, isOpen }: CollapseProps) => {
  return (
    <AnimatePresence initial={false}>
      {isOpen ? <CollapseContent className={className}>{children}</CollapseContent> : null}
    </AnimatePresence>
  );
};
