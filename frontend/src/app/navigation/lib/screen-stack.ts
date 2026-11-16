import type { ScreenNavigation, ScreenStackState } from "../types";

export const createScreenStack = ({ location, isRoot, direction = "right" }: ScreenNavigation): ScreenStackState => ({
  entries: [{ key: location.key, location, isRoot, direction }],
  index: 0,
  movement: "none",
});

export const updateScreenStack = (state: ScreenStackState, navigation: ScreenNavigation): ScreenStackState => {
  const { location, action, isRoot, direction = "right" } = navigation;
  const current = state.entries[state.index];

  if (current.location.key === location.key) {
    return state;
  }

  if (action === "REPLACE") {
    const navigationState: unknown = location.state;
    const reveal =
      typeof navigationState === "object" &&
      navigationState !== null &&
      "screenTransition" in navigationState &&
      navigationState.screenTransition === "reveal";

    if (reveal || isRoot) {
      return {
        ...state,
        movement: reveal ? "back" : "none",
        entries: state.entries.map((screen, index) =>
          index === state.index ? { key: location.key, location, isRoot: true, direction } : screen
        ),
      };
    }

    return {
      ...state,
      movement: "none",
      entries: state.entries.map((screen, index) =>
        index === state.index ? { ...screen, location, direction, isRoot: screen.isRoot || isRoot } : screen
      ),
    };
  }

  if (action === "POP") {
    const index = state.entries.findIndex((screen) => screen.location.key === location.key);

    if (index === -1) {
      return createScreenStack(navigation);
    }

    return { ...state, index, movement: index < state.index ? "back" : "forward" };
  }

  const entries = [...state.entries.slice(0, state.index + 1), { key: location.key, location, isRoot, direction }];

  return { entries, index: entries.length - 1, movement: isRoot ? "none" : "forward" };
};

export const getVisibleScreens = (state: ScreenStackState) => {
  const visited = state.entries.slice(0, state.index + 1);

  const rootIndex = visited.map((screen) => screen.isRoot).lastIndexOf(true);

  return visited.slice(Math.max(0, rootIndex));
};
