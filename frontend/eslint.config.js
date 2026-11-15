import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const publicApiPatterns = [
  {
    regex: "^@(app|pages|widgets|features)/[^/]+/(?!types$|model$|api$|hooks$|lib$).*",
    message: "Импорты допустимы только из корня слайса или его публичных папок: types, model, api, hooks, lib.",
  },
  {
    regex: "^@entities/[^/]+/(?!types$|ui$|model$|api$|hooks$|lib$).*",
    message: "Импорты из entities допустимы только из корня слайса или его публичных папок.",
  },
  {
    regex: "^@shared/(?!icons/)[^/]+/.*",
    message: "Импорты из shared допустимы только из его публичных папок первого уровня.",
  },
];

const noRestrictedImports = (patterns = []) => ["error", { patterns: [...publicApiPatterns, ...patterns] }];

const restrictUpperLayers = (layers) => ({
  regex: `^@(${layers.join("|")})(?:/|$)`,
  message: "Нижний слой не может импортировать код из вышестоящего слоя.",
});

const lineLengthLimit = 120;

const variableDeclarationSelector =
  ":matches(VariableDeclaration, ExportNamedDeclaration[declaration.type='VariableDeclaration'])";

const variableDeclarations = { selector: variableDeclarationSelector };

const contentsRequiringPadding = [
  "ArrowFunctionExpression",
  "FunctionExpression",
  `Literal[value.length > ${lineLengthLimit}]`,
  `TemplateElement[value.raw.length > ${lineLengthLimit}]`,
].join(", ");

const variableDeclarationsRequiringPadding = {
  selector: `${variableDeclarationSelector}:has(${contentsRequiringPadding})`,
};

const interfaceDeclarations = [
  "interface",
  { selector: ":matches(ExportNamedDeclaration, ExportDefaultDeclaration)[declaration.type='TSInterfaceDeclaration']" },
];

export default defineConfig([
  globalIgnores(["**/dist/"]),

  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    rules: {
      "prefer-arrow-callback": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionDeclaration",
          message: "Объявляйте функции через const и стрелочный синтаксис.",
        },
        {
          selector:
            "FunctionExpression[parent.type!='MethodDefinition'][parent.kind!='constructor'][parent.kind!='get'][parent.kind!='set']",
          message: "Используйте стрелочные функции, кроме методов классов.",
        },
      ],
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: { projectService: true },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      "@stylistic": stylistic,
      "unused-imports": unusedImports,
    },
    rules: {
      "max-len": [
        "warn",
        {
          code: lineLengthLimit,
          tabWidth: 2,
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      "no-restricted-imports": noRestrictedImports(),
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: "*", next: ["if", "for", "switch", "try"] },
        { blankLine: "always", prev: ["if", "for", "switch", "try"], next: "*" },
        { blankLine: "always", prev: "*", next: [variableDeclarations, ...interfaceDeclarations] },
        { blankLine: "any", prev: variableDeclarations, next: variableDeclarations },
        { blankLine: "always", prev: variableDeclarationsRequiringPadding, next: variableDeclarations },
        { blankLine: "always", prev: variableDeclarations, next: variableDeclarationsRequiringPadding },
        { blankLine: "always", prev: interfaceDeclarations, next: "*" },
      ],
      "@stylistic/lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/strict-boolean-expressions": "error",
    },
  },

  {
    files: ["**/*.{tsx,jsx}"],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: { projectService: true },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react,
      "jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      "react/jsx-key": "error",
      "react/jsx-no-bind": "off",
      "react/jsx-sort-props": [
        "error",
        {
          callbacksLast: false,
          ignoreCase: false,
          noSortAlphabetically: false,
          reservedFirst: ["key", "ref"],
          shorthandFirst: false,
          shorthandLast: false,
        },
      ],
      "react/no-array-index-key": "error",
      "react/self-closing-comp": ["error", { component: true, html: true }],
    },
  },

  {
    files: ["src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": noRestrictedImports([restrictUpperLayers(["app"])]),
    },
  },
  {
    files: ["src/widgets/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": noRestrictedImports([restrictUpperLayers(["app", "pages"])]),
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": noRestrictedImports([restrictUpperLayers(["app", "pages", "widgets"])]),
    },
  },
  {
    files: ["src/entities/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": noRestrictedImports([restrictUpperLayers(["app", "pages", "widgets", "features"])]),
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": noRestrictedImports([
        restrictUpperLayers(["app", "pages", "widgets", "features", "entities"]),
      ]),
    },
  },
]);
