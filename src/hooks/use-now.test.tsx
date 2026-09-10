import { act, renderHook } from '@testing-library/react-native';

import { useNow } from './use-now';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useNow', () => {
  test('returns a timestamp immediately', async () => {
    jest.setSystemTime(new Date(2026, 8, 9, 14, 32));
    const { result } = await renderHook(() => useNow());
    expect(result.current).toBe(new Date(2026, 8, 9, 14, 32).getTime());
  });

  test('advances as time passes', async () => {
    jest.setSystemTime(new Date(2026, 8, 9, 14, 32));
    const { result } = await renderHook(() => useNow(1000));
    const first = result.current;

    await act(async () => {
      jest.setSystemTime(new Date(2026, 8, 9, 14, 33));
      jest.advanceTimersByTime(1000);
    });

    expect(result.current).toBeGreaterThan(first);
  });

  test('does not change between ticks', async () => {
    jest.setSystemTime(new Date(2026, 8, 9, 14, 32));
    const { result } = await renderHook(() => useNow(10_000));
    const first = result.current;

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe(first);
  });
});
