import { useState } from "react";
import { useLocation, useNavigationType } from "react-router";

import { createScreenStack, getVisibleScreens, updateScreenStack } from "../lib";
import type { ScreenDirection } from "../types";

export const useScreenStack = (isRoot: boolean, direction: ScreenDirection) => {
  const location = useLocation();
  const action = useNavigationType();
  const navigation = { location, action, isRoot, direction };

  const [stored, setStored] = useState(() => createScreenStack(navigation));

  const state = updateScreenStack(stored, navigation);

  if (state !== stored) {
    setStored(state);
  }

  return { state, screens: getVisibleScreens(state) };
};
