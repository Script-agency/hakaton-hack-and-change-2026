import type { Plugin } from "vite";

const cssPlaceholder = "__HACK_CHANGE_WIDGET_CSS__";

export const widgetStyles = (): Plugin => {
  return {
    name: "widget-shadow-styles",
    enforce: "post",
    transform: (code, id) => {
      if (!/\.(css|scss|sass)(?:\?|$)/.test(id) || !code.includes("__vite__updateStyle")) {
        return null;
      }

      // Redirect Vite's CSS HMR helpers into our Shadow DOM style registry.
      return {
        code: code.replace(/from ["'][^"']*\/@vite\/client["']/, 'from "/src/app/styles/style-manager.ts"'),
        map: null,
      };
    },
    generateBundle: (_options, bundle) => {
      let css = "";

      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type === "asset" && fileName.endsWith(".css")) {
          css += `${String(output.source)}\n`;
          delete bundle[fileName];
        }
      }

      for (const output of Object.values(bundle)) {
        if (output.type === "chunk" && output.isEntry) {
          if (!output.code.includes(cssPlaceholder)) {
            throw new Error("Widget CSS placeholder is missing from the entry bundle.");
          }

          const code = output.code.replace(new RegExp(`(["'])${cssPlaceholder}\\1`), () => JSON.stringify(css));

          if (code === output.code) {
            throw new Error("Could not inline widget CSS into the entry bundle.");
          }

          output.code = code;
        }
      }
    },
  };
};
