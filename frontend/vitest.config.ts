import { defineConfig } from 'vitest/config'

// Vitest config is kept separate from vite.config.ts: Vitest 2.x bundles its
// own (older) Vite, and referencing vitest types inside vite.config.ts causes a
// type-identity clash with the project's newer Vite. This file is not part of
// the tsc build (not in any tsconfig "include"); Vitest loads it at runtime.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
