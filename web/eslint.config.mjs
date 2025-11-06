import { defineConfig } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
    {
        ignores: [
            ".next/**",
            "node_modules/**", 
            "out/**",
            "public/**",
            "coverage/**",
            "*.config.*",
            "next-env.d.ts"
        ]
    },
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        rules: {
            camelcase: ["error", {
                properties: "never",
            }],

            "no-console": ["error", {
                allow: ["warn", "error"],
            }],
            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            }],
            "react-hooks/exhaustive-deps": "off",
            "@next/next/no-img-element": "off",
            "@typescript-eslint/triple-slash-reference": "off",
        },
    },
    {
        files: ["bin/**/*.js"],
        rules: {
            "@typescript-eslint/no-require-imports": "off",
            "no-console": "off",
        }
    }
]);