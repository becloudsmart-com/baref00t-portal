// ESLint v9 flat config — minimal, no FlatCompat, no eslint-config-next.
//
// eslint-config-next ships broken FlatCompat shims for v9 that crash the
// config validator with circular structure errors. Since TypeScript
// correctness is enforced by the separate `pnpm typecheck` step, all we
// need from eslint is style + obvious-bug catching.

import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'

export default [
  { ignores: ['.next/**', 'node_modules/**', 'dist/**', 'next-env.d.ts'] },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { jsx: true },
    },
    rules: {
      // tsc handles these — eslint parses them with false positives.
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-undef': 'off',
      'no-empty': 'off',
    },
  },
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals — used by scripts/* and any *.mjs that runs
        // outside the Next bundle.
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
      },
    },
    rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] },
  },
  {
    // Service workers run in a worker scope (not browser/node), so they
    // need their own globals declared — `self`, `caches`, `fetch`,
    // `console`, etc. — otherwise no-undef fires on every line.
    files: ['public/sw.js', 'public/**/sw*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        clients: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        addEventListener: 'readonly',
      },
    },
    rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] },
  },
]
