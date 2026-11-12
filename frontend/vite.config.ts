import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { widgetStyles } from "./tooling/widget-styles";

export default defineConfig(({ command }) => ({
  plugins: [react(), widgetStyles()],
  define: command === "build" ? { "process.env.NODE_ENV": JSON.stringify("production") } : {},
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
      "@widgets": fileURLToPath(new URL("./src/widgets", import.meta.url)),
      "@features": fileURLToPath(new URL("./src/features", import.meta.url)),
      "@entities": fileURLToPath(new URL("./src/entities", import.meta.url)),
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL("./src/widget.tsx", import.meta.url)),
      name: "EnergyToolAssistant",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    cssCodeSplit: false,
    copyPublicDir: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
}));
