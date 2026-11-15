import type { ReactNode } from "react";
import type { Location, NavigationType } from "react-router";

export type ScreenDirection = "right" | "bottom";

export interface ScreenOptions {
  isActive: boolean;
  onBack?: () => void;
  onNewChat: () => void;
}

export interface ScreenPageRoute {
  children?: never;
  path: string;
  stack: "root" | "screen";
  direction?: ScreenDirection;
  render: (options: ScreenOptions) => ReactNode;
}

export interface ScreenLayoutRoute {
  children: ScreenRoute[];
  render: (options: ScreenOptions) => ReactNode;
}

export type ScreenRoute = ScreenPageRoute | ScreenLayoutRoute;

export interface StackScreen {
  direction: ScreenDirection;
  key: string;
  location: Location;
  isRoot: boolean;
}

export interface ScreenStackState {
  entries: StackScreen[];
  index: number;
  movement: "forward" | "back" | "none";
}

export interface ScreenNavigation {
  direction?: ScreenDirection;
  location: Location;
  action: NavigationType;
  isRoot: boolean;
}
