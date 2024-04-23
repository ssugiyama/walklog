import globals from 'globals';

import path from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import pluginJs from '@eslint/js';
import babelParser from '@babel/eslint-parser';

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname, recommendedConfig: pluginJs.configs.recommended });

export default [
    {
        ignores: ['dist/*', 'public/*', 'eslint.config.mjs'],
    },
    ...compat.extends('airbnb'),
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
                google: 'readonly',
            },
            parser: babelParser,
        },

        rules: {
            camelcase: ['error', {
                allow: [
                    'user_id',
                    'passport_id',
                    'the_geom',
                    '_changed$',
                    'created_at',
                    'updated_at',
                    '_first$',
                    'use_env_variable',
                ],
            }],
            'global-require': 'off',
            'import/no-dynamic-require': 'off',
            'import/no-named-as-default': 'off',
            'import/no-named-as-default-member': 'off',
            indent: ['error', 4],
            'linebreak-style': ['error', 'unix'],
            'no-alert': 'off',
            'no-cond-assign': ['error', 'except-parens'],
            'no-console': ['error', {
                allow: ['error', 'warn', 'info'],
            }],
            'no-nested-ternary': 'off',
            'no-param-reassign': 'off',
            'operator-linebreak': ['error', 'after'],
            quotes: ['error', 'single'],
            'react/function-component-definition': ['error', {
                namedComponents: 'arrow-function',
            }],
            'react/jsx-filename-extension': 'off',
            'react/jsx-indent': ['error', 4],
            'react/jsx-indent-props': ['error', 4],
            'react/jsx-props-no-spreading': 'off',
            'react/jsx-uses-react': 'error',
            'react/jsx-uses-vars': 'error',
            'react/no-danger': 'off',
            'react/prop-types': 'off',
            semi: ['error', 'always'],
        },
    },
];
