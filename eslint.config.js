// Root flat ESLint config (ESLint v9+).
// The pre-completion linter runs from /app; without a root config the engine
// errors out ("couldn't find eslint.config.js"). This config lints only the
// frontend source and ignores backend / vendor / build artifacts.
let globals, reactHooks;
try {
  globals = require("/app/frontend/node_modules/globals");
} catch (e) {
  globals = { browser: {}, node: {}, serviceworker: {} };
}
try {
  reactHooks = require("/app/frontend/node_modules/eslint-plugin-react-hooks");
} catch (e) {
  reactHooks = null;
}

const config = [
  {
    ignores: [
      "backend/**",
      "public-site/**",
      "**/node_modules/**",
      "**/build/**",
      "**/dist/**",
      "**/public/**",
      "**/plugins/**",
      "**/*.min.js",
      "**/chrome-extension/**",
    ],
  },
  {
    files: ["frontend/src/**/*.{js,jsx,ts,tsx}"],
    ...(reactHooks ? { plugins: { "react-hooks": reactHooks } } : {}),
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...(globals.browser || {}),
        ...(globals.node || {}),
        ...(globals.serviceworker || {}),
      },
    },
    rules: reactHooks
      ? { "react-hooks/rules-of-hooks": "warn", "react-hooks/exhaustive-deps": "warn" }
      : {},
  },
];

module.exports = config;
