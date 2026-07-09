import js from '@eslint/js';
import globals from 'globals';
import importSort from 'eslint-plugin-simple-import-sort';
import prettier from 'eslint-plugin-prettier';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import tseslint from 'typescript-eslint';

const ignoredPaths = [
    '**/*/coverage/**/*',
    '**/*/build/**/*',
    '**/*/es/**/*',
    '**/*/dist/**/*',
    '**/*/out/**/*',
    'apps/server/app/generated/**/*',
    '**/.vite/**/*',
    'apps/desktop/forge.config.ts',
    'apps/desktop/vite.*.config.ts',
    'apps/desktop/vitest.config.ts'
];

const sortRules = {
    'simple-import-sort/imports': [
        'error',
        {
            groups: [
                ['^\\w'],
                ['^@\\w'],
                ['^@/'],
                ['^\\u0000'],
                ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
                ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$']
            ]
        }
    ],
    'simple-import-sort/exports': 'error'
};

const typedTsFiles = tseslint.config({
    files: ['**/*.{ts,tsx}'],
    ignores: ignoredPaths,
    rules: {
        '@typescript-eslint/array-type': 'error',
        '@typescript-eslint/no-for-in-array': 'error',
        '@typescript-eslint/no-explicit-any': 'off',
        'no-undef': 'warn',
        'no-console': 'error',
        ...sortRules,
        'prettier/prettier': 'error'
    },
    languageOptions: {
        parser: tseslint.parser,
        globals: {
            ...globals.browser,
            ...globals.node,
            MAIN_WINDOW_VITE_DEV_SERVER_URL: 'readonly',
            MAIN_WINDOW_VITE_NAME: 'readonly',
            miaomaAPI: 'readonly'
        },
        parserOptions: {
            project: ['**/*/tsconfig.json'],
            tsconfigRootDir: import.meta.dirname
        }
    },
    plugins: { 'simple-import-sort': importSort, prettier }
});

const vueFiles = tseslint.config({
    files: ['**/*.vue'],
    ignores: ignoredPaths,
    rules: {
        ...vue.configs['flat/recommended'].at(-1).rules,
        ...sortRules,
        'prettier/prettier': 'error',
        'vue/multi-word-component-names': 'off'
    },
    languageOptions: {
        parser: vueParser,
        parserOptions: {
            parser: tseslint.parser,
            extraFileExtensions: ['.vue'],
            project: ['**/*/tsconfig.json'],
            tsconfigRootDir: import.meta.dirname
        },
        globals: {
            ...globals.browser,
            ...globals.node
        }
    },
    plugins: { vue, 'simple-import-sort': importSort, prettier }
});

const configFiles = tseslint.config({
    files: ['apps/desktop/*config.ts', 'apps/desktop/vitest.config.ts'],
    languageOptions: {
        parser: tseslint.parser,
        globals: {
            ...globals.node
        }
    },
    rules: {
        'no-console': 'error',
        'prettier/prettier': 'error'
    },
    plugins: { prettier }
});

export default tseslint.config(
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        ignores: ignoredPaths,
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    },
    typedTsFiles,
    vueFiles,
    configFiles
);
