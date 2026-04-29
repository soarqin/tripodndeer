module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-ts-comment': 'error',
    'max-lines-per-function': ['warn', 50],
    'react/react-in-jsx-scope': 'off',
  },
  settings: {
    react: { version: 'detect' },
  },
  overrides: [
    // Engine layer: ban react/react-dom/zustand imports + browser globals
    {
      files: ['src/engine/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'react', message: 'Engine layer must not depend on UI libraries' },
              { name: 'react-dom', message: 'Engine layer must not depend on UI libraries' },
              { name: 'zustand', message: 'Engine layer must not depend on UI libraries' },
              { name: 'date-fns', message: 'Banned dependency' },
              { name: 'dayjs', message: 'Banned dependency' },
              { name: 'moment', message: 'Banned dependency' },
              { name: 'lodash', message: 'Banned dependency' },
              { name: 'immutable', message: 'Banned dependency' },
              { name: 'rxjs', message: 'Banned dependency' },
              { name: 'react-i18next', message: 'Banned dependency' },
              { name: 'i18next', message: 'Banned dependency' },
            ],
            patterns: [
              { group: ['react', 'react-dom', 'zustand'], message: 'Engine layer must not depend on UI libraries' },
              { group: ['date-fns', 'dayjs', 'moment', 'lodash', 'immutable', 'rxjs', 'react-i18next', 'i18next'], message: 'Banned dependency' },
            ],
          },
        ],
        'no-restricted-globals': [
          'error',
          { name: 'window', message: 'Engine must be browser-agnostic' },
          { name: 'document', message: 'Engine must be browser-agnostic' },
          { name: 'navigator', message: 'Engine must be browser-agnostic' },
          { name: 'requestAnimationFrame', message: 'Engine must be browser-agnostic' },
          { name: 'cancelAnimationFrame', message: 'Engine must be browser-agnostic' },
          { name: 'performance', message: 'Engine must be browser-agnostic' },
        ],
        'no-restricted-syntax': [
          'error',
          { selector: 'ImportDeclaration[source.value="react"]', message: 'Engine layer must not depend on UI libraries' },
          { selector: 'ImportDeclaration[source.value="react-dom"]', message: 'Engine layer must not depend on UI libraries' },
          { selector: 'ImportDeclaration[source.value="zustand"]', message: 'Engine layer must not depend on UI libraries' },
          { selector: 'ImportDeclaration[source.value="date-fns"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="dayjs"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="moment"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="lodash"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="immutable"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="rxjs"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="react-i18next"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="i18next"]', message: 'Banned dependency' },
        ],
      },
    },
    {
      files: ['src/**/*.ts', 'src/**/*.tsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'date-fns', message: 'Banned dependency' },
              { name: 'dayjs', message: 'Banned dependency' },
              { name: 'moment', message: 'Banned dependency' },
              { name: 'lodash', message: 'Banned dependency' },
              { name: 'immutable', message: 'Banned dependency' },
              { name: 'rxjs', message: 'Banned dependency' },
              { name: 'react-i18next', message: 'Banned dependency' },
              { name: 'i18next', message: 'Banned dependency' },
            ],
            patterns: [
              { group: ['date-fns', 'dayjs', 'moment', 'lodash', 'immutable', 'rxjs', 'react-i18next', 'i18next'], message: 'Banned dependency' },
            ],
          },
        ],
        'no-restricted-syntax': [
          'error',
          { selector: 'ImportDeclaration[source.value="date-fns"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="dayjs"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="moment"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="lodash"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="immutable"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="rxjs"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="react-i18next"]', message: 'Banned dependency' },
          { selector: 'ImportDeclaration[source.value="i18next"]', message: 'Banned dependency' },
        ],
      },
    },
  ],
}
