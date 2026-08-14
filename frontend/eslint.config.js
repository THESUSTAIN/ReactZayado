// Flat ESLint config (ESLint v9+). CRA/craco builds use their own internal
// eslint config via react-scripts, so this file does not affect the build.
// It exists so the standalone `eslint` engine can run without erroring out.
// All optional requires are wrapped so a missing dependency can NEVER crash
// the lint engine (it degrades gracefully instead of throwing).
let globals = {};
try {
  globals = require("globals") || {};
} catch (e) {
  globals = {};
}

let reactHooks = null;
try {
  reactHooks = require("eslint-plugin-react-hooks");
} catch (e) {
  reactHooks = null;
}

const block = {
  files: ["src/**/*.{js,jsx,ts,tsx}"],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
    globals: {
      ...(globals.browser || {}),
      ...(globals.node || {}),
      ...(globals.serviceworker || {}),
    },
  },
  rules: {},
};

if (reactHooks) {
  block.plugins = { "react-hooks": reactHooks };
  block.rules = {
    "react-hooks/rules-of-hooks": "warn",
    "react-hooks/exhaustive-deps": "warn",
  };
}

module.exports = [
  {
    ignores: [
      "build/**",
      "dist/**",
      "node_modules/**",
      "public/**",
      "plugins/**",
      "coverage/**",
      "*.config.js",
      "**/*.min.js",
      "**/serviceWorker*.js",
      "**/service-worker*.js",
      "**/*.sw.js",
    ],
  },
  block,
];
