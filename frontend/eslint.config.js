// Flat ESLint config (ESLint v9+). CRA/craco builds use their own internal
// eslint config via react-scripts, so this file does not affect the build.
// It exists so the standalone `eslint` engine can run without erroring out.
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "build/**",
      "dist/**",
      "node_modules/**",
      "public/**",
      "plugins/**",
      "**/*.min.js",
    ],
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "react-hooks": require("eslint-plugin-react-hooks"),
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    rules: {
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
