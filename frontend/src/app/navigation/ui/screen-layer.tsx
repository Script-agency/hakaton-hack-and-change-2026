import { useLayoutEffect, useRef } from "react";
import { useIsPresent, useReducedMotion } from "framer-motion";
import * as m from "framer-motion/m";
import { useRoutes } from "react-router";

import { getScreenExit, getScreenInitial, getScreenTransition } from "../lib";
import type { ScreenOptions, ScreenRoute, StackScreen } from "../types";
import styles from "./screen-stack.module.scss";

interface ScreenLayerProps {
  screen: StackScreen;
  index: number;
  active: boolean;
  animateEnter: boolean;
  isPanelOpen: boolean;
  routes: ScreenRoute[];
  onBack?: () => void;
  onNewChat: () => void;
}

export const ScreenLayer = ({
  screen,
  index,
  active,
  animateEnter,
  isPanelOpen,
  routes,
  onBack,
  onNewChat,
}: ScreenLayerProps) => {
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion() === true;
  const isInteractive = active && isPresent;
  const layerRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const options: ScreenOptions = { isActive: isInteractive, onBack, onNewChat };

  const content = useRoutes(
    routes.map((route) => ({ path: route.path, element: route.render(options) })),
    screen.location
  );

  useLayoutEffect(() => {
    if (!isInteractive || !isPanelOpen) {
      return;
    }

    const previous = lastFocusRef.current;

    if (previous !== null && previous.isConnected && layerRef.current?.contains(previous) === true) {
      previous.focus({ preventScroll: true });
    } else {
      layerRef.current?.focus({ preventScroll: true });
    }
  }, [isInteractive, isPanelOpen]);

  return (
    <>
      {index > 0 ? (
        <m.div
          animate={{ opacity: 1 }}
          aria-hidden="true"
          className={styles.scrim}
          exit="leave"
          initial={reducedMotion ? false : { opacity: 0 }}
          style={{ zIndex: index * 2 - 1 }}
          transition={getScreenTransition(!reducedMotion)}
          variants={{
            leave: (animateExit: boolean) => ({
              opacity: 0,
              transition: getScreenTransition(animateExit && !reducedMotion),
            }),
          }}
        />
      ) : null}
      <m.div
        ref={layerRef}
        animate={{ x: 0, y: 0 }}
        aria-hidden={!isInteractive}
        className={styles.screen}
        data-screen-active={isInteractive}
        data-screen-path={screen.location.pathname}
        exit="leave"
        inert={!isInteractive}
        initial={getScreenInitial(animateEnter, reducedMotion, screen.direction)}
        onFocusCapture={(event) => {
          if (event.target instanceof HTMLElement && event.target !== layerRef.current) {
            lastFocusRef.current = event.target;
          }
        }}
        style={{ zIndex: index * 2 }}
        tabIndex={-1}
        transition={getScreenTransition(!reducedMotion)}
        variants={{ leave: (animateExit: boolean) => getScreenExit(animateExit, reducedMotion, screen.direction) }}
      >
        {content}
      </m.div>
    </>
  );
};
