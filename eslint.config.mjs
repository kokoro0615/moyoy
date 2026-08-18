import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    ".private/**",
    "20260818_web/**",
    "artifacts/**",
    "coverage/**",
    "out/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
