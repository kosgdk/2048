module.exports = {
    root: true,
    overrides: [
        {
            files: ['*.js', '*.ts', '*.jsx', '*.tsx']
        }
    ],
    env: { browser: true, es2020: true },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
        'prettier'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    plugins: ['react-refresh', 'unused-imports', 'eslint-plugin-react'],
    rules: {
        'react-refresh/only-export-components': 'off',
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        'no-var': 'error',
        'prefer-const': 'error',
        'no-duplicate-imports': 'error',
        eqeqeq: ['error', 'always'],
        'array-element-newline': ['error', 'consistent'],
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-vars': [
            'warn',
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }
        ],
        'unused-imports/no-unused-imports': 'error',
        '@typescript-eslint/no-empty-interface': 'off',
        'react/jsx-curly-brace-presence': [
            'error',
            {
                props: 'never',
                children: 'never',
                propElementValues: 'always'
            }
        ],
        'jsx-quotes': ['error', 'prefer-single'],
        'no-irregular-whitespace': 'off'
    }
};
