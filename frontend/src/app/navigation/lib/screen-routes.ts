import { matchPath, type RouteObject } from "react-router";

import type { ScreenOptions, ScreenPageRoute, ScreenRoute } from "../types";

export const findScreenRoute = (routes: ScreenRoute[], pathname: string): ScreenPageRoute | undefined => {
  for (const route of routes) {
    if (route.children !== undefined) {
      const match = findScreenRoute(route.children, pathname);

      if (match !== undefined) {
        return match;
      }
    } else if (matchPath(route.path, pathname) !== null) {
      return route;
    }
  }

  return undefined;
};

export const createScreenRouteObjects = (routes: ScreenRoute[], options: ScreenOptions): RouteObject[] =>
  routes.map((route) => {
    if (route.children !== undefined) {
      return {
        element: route.render(options),
        children: createScreenRouteObjects(route.children, options),
      };
    }

    return { path: route.path, element: route.render(options) };
  });
