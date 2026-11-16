import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@app/app";
import { AppProviders } from "@app/providers";
import { assertWidgetCanMount, getMountedWidget, registerWidget, unregisterWidget } from "@app/widget-instance";

import { configureChatDebug, resetChatState } from "@entities/chat/model";
import { resetLeadState } from "@entities/lead/model";

import { createQueryClient } from "@shared/config";

import { attachStyles } from "./app/styles/style-manager";

import "./app/styles/global.scss";

export interface WidgetOptions {
  container?: HTMLElement;
  debug?: boolean;
}

export interface WidgetInstance {
  unmount: () => void;
}

const shadows = new WeakMap<HTMLElement, ShadowRoot>();

export const mount = ({ container: providedContainer, debug = false }: WidgetOptions = {}): WidgetInstance => {
  assertWidgetCanMount();

  const container = providedContainer ?? document.createElement("div");

  if (providedContainer === undefined && document.body === null) {
    throw new Error("EnergyToolAssistant.mount() requires document.body. Call it after the body is available.");
  }

  const shadow = shadows.get(container) ?? container.attachShadow({ mode: "open" });

  shadows.set(container, shadow);

  const detachStyles = attachStyles(shadow);
  const rootElement = container.ownerDocument.createElement("div");

  rootElement.setAttribute("data-widget-root", "");
  shadow.append(rootElement);

  if (providedContainer === undefined) {
    document.body.append(container);
  }

  configureChatDebug(debug);

  const root = createRoot(rootElement);
  const queryClient = createQueryClient();
  let mounted = true;

  root.render(
    <StrictMode>
      <AppProviders queryClient={queryClient}>
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
      resetLeadState();
      queryClient.clear();
      rootElement.remove();
      detachStyles();

      if (providedContainer === undefined) {
        container.remove();
      }

      unregisterWidget(registration);
    },
  };

  const registration = { container, instance };

  registerWidget(registration);

  return instance;
};

export const unmount = (container?: HTMLElement) => {
  const widget = getMountedWidget();

  if (widget !== undefined && (container === undefined || widget.container === container)) {
    widget.instance.unmount();
  }
};
