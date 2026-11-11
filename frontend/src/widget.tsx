import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@app/app";
import { AppProviders } from "@app/providers";

import { createQueryClient } from "@shared/config";

import { attachStyles } from "./app/styles/style-manager";

import "./app/styles/global.scss";

export interface WidgetOptions {
  container: HTMLElement;
  initialPath?: string;
}

export interface WidgetInstance {
  unmount: () => void;
}

const instances = new WeakMap<HTMLElement, WidgetInstance>();
const shadows = new WeakMap<HTMLElement, ShadowRoot>();

export const mount = ({ container, initialPath = "/" }: WidgetOptions): WidgetInstance => {
  if (instances.has(container)) {
    throw new Error("A widget is already mounted in this container. Unmount it first.");
  }

  if (!initialPath.startsWith("/") || initialPath.startsWith("//")) {
    throw new Error("initialPath must be an internal path starting with /.");
  }

  const shadow = shadows.get(container) ?? container.attachShadow({ mode: "open" });

  shadows.set(container, shadow);

  const detachStyles = attachStyles(shadow);
  const rootElement = container.ownerDocument.createElement("div");

  rootElement.setAttribute("data-widget-root", "");
  shadow.append(rootElement);

  const root = createRoot(rootElement);
  const queryClient = createQueryClient();
  let mounted = true;

  root.render(
    <StrictMode>
      <AppProviders initialPath={initialPath} queryClient={queryClient}>
        <App />
      </AppProviders>
    </StrictMode>
  );

  const instance: WidgetInstance = {
    unmount: () => {
      if (!mounted) {
        return;
      }

      mounted = false;
      root.unmount();
      queryClient.clear();
      rootElement.remove();
      detachStyles();
      instances.delete(container);
    },
  };

  instances.set(container, instance);

  return instance;
};

export const unmount = (container: HTMLElement) => {
  instances.get(container)?.unmount();
};
