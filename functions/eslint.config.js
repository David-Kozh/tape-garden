const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");

module.exports = [
  js.configs.recommended,
  {
    ignores: ["lib/**/*", "generated/**/*"],
  },
  // Global rules for all files (JS and TS)
  {
    files: ["**/*.js", "**/*.ts"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        exports: "readonly",
      },
    },
    rules: {
      "quotes": ["error", "double"],
      "indent": ["error", 2],
      "object-curly-spacing": ["error", "never"],
    },
  },
  // TypeScript-specific configuration
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: ["tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },
];
