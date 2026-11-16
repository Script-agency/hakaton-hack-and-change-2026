import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: Object.fromEntries(
      ["app", "pages", "widgets", "features", "entities", "shared"].map((name) => [
        `@${name}`,
        fileURLToPath(new URL(`./src/${name}`, import.meta.url)),
      ])
    ),
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    allowOnly: process.env.CI !== "true",
  },
});
