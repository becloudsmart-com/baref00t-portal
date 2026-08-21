import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // #1008 — `src/**` was missing, so src/lib/membership.test.ts had NEVER
    // run. That is the #985 membership/Admin refusal suite: 10 tests asserting
    // that a non-member, a Suspended member and a bare `email` claim are all
    // refused. Type-checking it (this PR) without running it would have been
    // the worse outcome — a suite that looks covered twice over and executes
    // zero times.
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    environment: 'node',
    globals: false,
  },
  resolve: {
    alias: {
      '@': new URL('./src/', import.meta.url).pathname,
    },
  },
})
