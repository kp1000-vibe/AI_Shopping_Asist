import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { resetRouterMock } from '@/tests/router-mock';

// The App Router is not available outside the Next runtime. Tests import
// `routerMock` from '@/tests/router-mock' to assert on navigation.
vi.mock('next/navigation', async () => {
  const { routerMock } = await import('@/tests/router-mock');
  return {
    useRouter: () => routerMock,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    notFound: vi.fn(),
  };
});

const hasDom = typeof window !== 'undefined';

afterEach(() => {
  resetRouterMock();
  if (!hasDom) return;
  cleanup();
  // A Radix menu left open sets `pointer-events: none` on the body, which
  // makes every later userEvent click in the file time out.
  document.body.style.pointerEvents = '';
});

// jsdom does not implement these; Radix primitives rely on them.
if (hasDom && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Radix primitives use the Pointer Events capture API, which jsdom lacks.
for (const method of hasDom
  ? (['hasPointerCapture', 'setPointerCapture', 'releasePointerCapture'] as const)
  : []) {
  if (!(method in Element.prototype)) {
    Object.defineProperty(Element.prototype, method, {
      writable: true,
      value: method === 'hasPointerCapture' ? () => false : () => {},
    });
  }
}

if (hasDom && !Element.prototype.scrollIntoView) {
  Object.defineProperty(Element.prototype, 'scrollIntoView', { writable: true, value: () => {} });
}

if (hasDom && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
