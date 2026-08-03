import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    clearMocks: true,
    restoreMocks: true,
    // One shared mongod for the whole run (see globalSetup.ts) instead of one per test file —
    // avoids parallel files racing to download/start their own instance.
    globalSetup: ['./src/__tests__/globalSetup.ts'],
    // mongodb-memory-server downloads a mongod binary on first use in a fresh environment/CI cache.
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/__tests__/**'],
    },
  },
})
