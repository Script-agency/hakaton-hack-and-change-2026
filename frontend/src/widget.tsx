import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@app/app";
import { AppProviders } from "@app/providers";
import { assertWidgetCanMount, getMountedWidget, registerWidget, unregisterWidget } from "@app/widget-instance";

import { resetChatState } from "@entities/chat/hooks";

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

const shadows = new WeakMap<HTMLElement, ShadowRoot>();

export const mount = ({ container, initialPath = "/" }: WidgetOptions): WidgetInstance => {
  assertWidgetCanMount();

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
      resetChatState();
      queryClient.clear();
      rootElement.remove();
      detachStyles();
      unregisterWidget(registration);
    },
  };

  const registration = { container, instance };

  registerWidget(registration);

  return instance;
};

export const unmount = (container: HTMLElement) => {
  const widget = getMountedWidget();

  if (widget?.container === container) {
    widget.instance.unmount();
  }
};
