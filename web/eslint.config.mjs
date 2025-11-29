import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import globals from "globals";
export default [
    js.configs.recommended,
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
        languageOptions: {
            parser: tsparser,
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                google: 'readonly',
                React: 'readonly',
                NodeJS: 'readonly',
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            camelcase: ["error", {
                properties: "never",
            }],
            "no-console": ["error", {
                allow: ["warn", "error"],
            }],
            "no-unused-vars": "off", // Use TypeScript version
            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            }],
        },
    },
    {
        files: ["bin/**/*.js"],
        rules: {
            "no-console": "off",
        }
    }
];