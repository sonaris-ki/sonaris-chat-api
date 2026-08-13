import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // scripts/embed-content.cjs laeuft vor dem Bau unter node und ist
    // bewusst CommonJS. Die TypeScript-Regel gegen require() passt dort
    // nicht.
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
