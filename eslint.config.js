import globals from 'globals';
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import jsdocPlugin from 'eslint-plugin-jsdoc';

export default [
    js.configs.recommended,
    {
        ignores: [
            'schemas/**',
            '.git/**',
            '**/gschemas.compiled',
            '*.sh',
            'LICENSE',
            'README.md',
            'metadata.json',
            'stylesheet.css'
        ]
    },
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
                ARGV: 'readonly',
                print: 'readonly',
                printerr: 'readonly',
                log: 'readonly',
                logError: 'readonly',
                imports: 'readonly',
                const: 'readonly',
                let: 'readonly',
                var: 'readonly'
            }
        },
        plugins: {
            prettier: prettierPlugin,
            jsdoc: jsdocPlugin
        },
        rules: {
            'prettier/prettier': 'error',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            semi: 'error',
            'jsdoc/valid-types': 'warn',
            'jsdoc/no-undefined-types': 'warn'
        }
    },
    prettierConfig
];
