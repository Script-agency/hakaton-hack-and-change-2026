import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@app/app";
import { AppProviders } from "@app/providers";

import { createQueryClient } from "@shared/config";

import "./app/styles/global.scss";

const container = document.getElementById("root");

if (container === null) {
  throw new Error("Root element was not found");
}

const queryClient = createQueryClient();

createRoot(container).render(
  <StrictMode>
    <AppProviders initialPath="/" queryClient={queryClient}>
      <App />
    </AppProviders>
  </StrictMode>
);
