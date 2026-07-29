import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";


const eslintConfig = [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  }
  , {
    rules: {
      "@next/next/no-img-element": "off",
    },
    settings: {
      next: {
        // Forces Next.js to locate your src/app folder properly
        rootDir: ".",
      },
    },
    // Prevents ESLint from scanning compiled assets and dependencies
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "public/**"
    ],
  },
];

export default eslintConfig;
