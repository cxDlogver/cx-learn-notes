import eslint from '@eslint/js'
import globals from 'globals'
import eslintPrettier from 'eslint-plugin-prettier'
import importSort from 'eslint-plugin-simple-import-sort'
import eslintOxlint from 'eslint-plugin-oxlint'

import tseslint from 'typescript-eslint'

export default tseslint.config(
    {
        ignores: ['**/node_modules/**', 'eslint.config.js', 'commitlint.config.js'],
        extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...eslintOxlint.configs['flat/recommended']],
        plugins: {
            'simple-import-sort': importSort,
            prettier: eslintPrettier,
        },
        rules: {
            'prettier/prettier': 'error',
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
        },
    },
    {
        files: ['packages/**/*.js'],
        rules: {
            'no-console': 'error',
        },
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        files: ['packages/**/*.ts'],
        rules: {
            'no-console': 'error',
        },
    }
)

// export default [
//   {
//     files: ["packages/**/*.js"],
//     rules: {
//       "no-console": "error",
//     },
//   },
// ];
