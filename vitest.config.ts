import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws outside an RSC bundle; swap it for a no-op so the
      // server modules it guards can still be unit tested.
      'server-only': fileURLToPath(new URL('./src/tests/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // Node by default; DOM suites opt in with a `@vitest-environment jsdom`
    // docblock. Spinning up jsdom for the pure-logic suites tripled run time.
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    restoreMocks: true,
    // Windows CI runners and dev laptops starve the reporter RPC when every
    // jsdom suite spins up at once, which surfaces as a worker timeout.
    maxWorkers: 4,
    minWorkers: 1,
    // jsdom renders the full header tree slowly on cold CI runners.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/lib/**/*.ts', 'src/components/**/*.tsx'],
      exclude: [
        'src/components/ui/**',
        // Async server component wrapped in unstable_cache; exercised by the
        // Playwright suite instead.
        'src/components/trending-deals.tsx',
        '**/*.test.{ts,tsx}',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
