import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

const decoratorLines = {
  meta: {
    type: "layout",
    fixable: "whitespace",
    schema: [],
    messages: { newline: "Put each decorator on its own line." },
  },
  create(context) {
    const source = context.sourceCode;

    return {
      ":matches(ClassDeclaration, ClassExpression, MethodDefinition, PropertyDefinition, TSAbstractMethodDefinition, TSAbstractPropertyDefinition)"(
        node,
      ) {
        for (const decorator of node.decorators ?? []) {
          const next = source.getTokenAfter(decorator, {
            includeComments: true,
          });

          if (next && next.loc.start.line === decorator.loc.end.line) {
            context.report({
              node: decorator,
              messageId: "newline",
              fix: (fixer) => fixer.insertTextAfter(decorator, "\n"),
            });
          }
        }
      },
    };
  },
};

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "node_modules/**",
      ".impeccable/**",
      "artifacts/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,mjs}"],
    plugins: { project: { rules: { "decorator-lines": decoratorLines } } },
    languageOptions: {
      globals: Object.fromEntries(
        [
          "console",
          "process",
          "Buffer",
          "fetch",
          "URL",
          "URLSearchParams",
          "AbortController",
          "AbortSignal",
          "Request",
          "Response",
          "Headers",
          "FormData",
          "Blob",
          "DOMException",
          "HTMLInputElement",
          "File",
          "setTimeout",
          "clearTimeout",
          "setInterval",
          "clearInterval",
          "window",
          "document",
          "HTMLElement",
          "HTMLDialogElement",
          "HTMLImageElement",
          "HTMLButtonElement",
          "HTMLFormElement",
          "KeyboardEvent",
          "Event",
          "__dirname",
          "Express",
          "NodeJS",
          "RequestInit",
        ].map((name) => [name, "readonly"]),
      ),
    },
    rules: {
      curly: ["error", "all"],
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "import", next: "*" },
        { blankLine: "never", prev: "import", next: "import" },
        {
          blankLine: "always",
          prev: "*",
          next: ["export", "function", "class", "return"],
        },
        {
          blankLine: "always",
          prev: ["export", "function", "class"],
          next: "*",
        },
      ],
      "lines-between-class-members": ["error", "always"],
      "project/decorator-lines": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            ":matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression) FunctionDeclaration",
          message: "Use a const arrow function for local handlers and helpers.",
        },
      ],
    },
  },
  {
    files: [
      "apps/web/src/{app,features}/**/*page.tsx",
      "apps/web/src/app/app.tsx",
    ],
    plugins: { "react-refresh": reactRefresh },
    rules: { "react-refresh/only-export-components": "error" },
  },
);
