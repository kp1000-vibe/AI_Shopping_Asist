/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSavedOffers } from '@/lib/use-saved';
import { makeOffer } from '@/tests/fixtures';

const STORAGE_KEY = 'priceshelf:saved:v1';

describe('useSavedOffers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts empty and reports hydration', async () => {
    const { result } = renderHook(() => useSavedOffers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('saves and unsaves an offer', async () => {
    const offer = makeOffer({ id: 'amazon-save-1' });
    const { result } = renderHook(() => useSavedOffers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.toggle(offer));
    expect(result.current.count).toBe(1);
    expect(result.current.isSaved('amazon-save-1')).toBe(true);

    act(() => result.current.toggle(offer));
    expect(result.current.count).toBe(0);
    expect(result.current.isSaved('amazon-save-1')).toBe(false);
  });

  it('persists to local storage', async () => {
    const { result } = renderHook(() => useSavedOffers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.toggle(makeOffer({ id: 'walmart-save-1' })));

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toContain('walmart-save-1');
  });

  it('reads items saved before mount', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'target-1',
          title: 'AirPods Pro 2',
          retailer: 'target',
          price: 199,
          url: 'https://www.target.com/p/1',
          savedAt: '2026-03-01T12:00:00.000Z',
        },
      ]),
    );

    const { result } = renderHook(() => useSavedOffers());
    await waitFor(() => expect(result.current.count).toBe(1));
  });

  it('removes a single item by id', async () => {
    const { result } = renderHook(() => useSavedOffers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.toggle(makeOffer({ id: 'amazon-a' })));
    act(() => result.current.toggle(makeOffer({ id: 'walmart-b', retailer: 'walmart' })));
    expect(result.current.count).toBe(2);

    act(() => result.current.remove('amazon-a'));
    expect(result.current.items.map((item) => item.id)).toEqual(['walmart-b']);
  });

  it('ignores corrupted storage contents', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'not json at all');
    const { result } = renderHook(() => useSavedOffers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.items).toEqual([]);
  });

  it('drops entries that are not saved offers', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ nope: true }, 'string']));
    const { result } = renderHook(() => useSavedOffers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.items).toEqual([]);
  });

  it('ignores a non-array payload', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'x' }));
    const { result } = renderHook(() => useSavedOffers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.items).toEqual([]);
  });

  it('survives storage being unavailable', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useSavedOffers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    expect(() => act(() => result.current.toggle(makeOffer({ id: 'amazon-x' })))).not.toThrow();
    setItem.mockRestore();
  });

  it('syncs between hook instances', async () => {
    const first = renderHook(() => useSavedOffers());
    const second = renderHook(() => useSavedOffers());
    await waitFor(() => expect(first.result.current.hydrated).toBe(true));
    await waitFor(() => expect(second.result.current.hydrated).toBe(true));

    act(() => first.result.current.toggle(makeOffer({ id: 'amazon-shared' })));
    await waitFor(() => expect(second.result.current.count).toBe(1));
  });
});
