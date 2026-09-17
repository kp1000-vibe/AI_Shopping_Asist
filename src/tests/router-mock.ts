import { vi } from 'vitest';

/**
 * Stable App Router double. `src/tests/setup.ts` wires this into
 * `next/navigation`, and tests import it to assert on navigation.
 */
export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

export function resetRouterMock(): void {
  for (const fn of Object.values(routerMock)) fn.mockClear();
}
