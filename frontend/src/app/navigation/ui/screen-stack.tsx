import { AnimatePresence } from "framer-motion";
import { matchPath, useLocation, useNavigate } from "react-router";

import { useChatUi } from "@entities/chat/model";

import { useScreenStack } from "../hooks";
import type { ScreenRoute } from "../types";
import { ScreenLayer } from "./screen-layer";
import styles from "./screen-stack.module.scss";

interface ScreenStackProps {
  routes: ScreenRoute[];
}

export const ScreenStack = ({ routes }: ScreenStackProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isPanelOpen = useChatUi((state) => state.isPanelOpen);

  const route = routes.find((candidate) => matchPath(candidate.path, location.pathname) !== null);

  const { state, screens } = useScreenStack(route?.stack === "root", route?.direction ?? "right");

  const handleBack = () => {
    void navigate(-1);
  };

  const handleNewChat = () => {
    useChatUi.getState().setDraft("start", "");
    void navigate("/", { replace: true });
  };

  return (
    <div className={styles.stack}>
      <AnimatePresence custom={state.movement === "back"} initial={false}>
        {screens.map((screen, index) => (
          <ScreenLayer
            key={screen.key}
            active={index === screens.length - 1}
            animateEnter={state.movement === "forward"}
            index={index}
            isPanelOpen={isPanelOpen}
            onBack={index > 0 ? handleBack : undefined}
            onNewChat={handleNewChat}
            routes={routes}
            screen={screen}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
