/**
 * Stub for the `server-only` package so server modules can be unit tested.
 * Vitest aliases `server-only` to this file; the real package throws when it is
 * imported from a client bundle, which is exactly what we want in production.
 */
export {};
