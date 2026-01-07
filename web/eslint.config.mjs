import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import globals from 'globals'
export default [
  js.configs.recommended,
  {
    ignores: [
      '.next/**',
      'node_modules/**', 
      'out/**',
      'public/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
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
      '@typescript-eslint': tseslint,
    },
    rules: {
      camelcase: ['error', {
        properties: 'never',
      }],
      'no-console': ['error', {
        allow: ['warn', 'error'],
      }],
      'no-unused-vars': 'off', // Use TypeScript version
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'semi': ['error', 'never'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'jsx-quotes': ['error', 'prefer-double'],
      'comma-dangle': ['error', 'always-multiline'],
      'indent': ['error', 2],
    },
  },
  {
    files: ['bin/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
]