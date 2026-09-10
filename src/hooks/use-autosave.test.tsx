import { act, renderHook } from '@testing-library/react-native';

import { useAutosave } from './use-autosave';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useAutosave', () => {
  test('starts idle', async () => {
    const { result } = await renderHook(() => useAutosave(jest.fn(), 600));
    expect(result.current.status).toBe('idle');
  });

  test('saves after the delay and reports saved', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() => useAutosave(save, 600));

    await act(() => result.current.change('hello'));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(save).toHaveBeenCalledWith('hello');
    expect(result.current.status).toBe('saved');
  });

  test('flush saves immediately', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() => useAutosave(save, 10_000));

    await act(() => result.current.change('urgent'));
    await act(async () => {
      await result.current.flush();
    });

    expect(save).toHaveBeenCalledWith('urgent');
  });

  test('reports unsaved when the write fails', async () => {
    const save = jest.fn().mockRejectedValue(new Error('nope'));
    const { result } = await renderHook(() => useAutosave(save, 10));

    await act(() => result.current.change('x'));
    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    expect(result.current.status).toBe('unsaved');
  });
});

describe('useAutosave when the save callback identity changes', () => {
  test('flushes the pending value through the outgoing saver', async () => {
    const first = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);

    const { result, rerender } = await renderHook(
      ({ save }: { save: (v: string) => Promise<void> }) => useAutosave(save, 10_000),
      { initialProps: { save: first } }
    );

    await act(() => result.current.change('half typed'));
    // Swapping the callback replaces the saver; the outgoing one must not
    // silently drop the pending write.
    await act(async () => {
      await rerender({ save: second });
    });

    expect(first).toHaveBeenCalledWith('half typed');
  });
});
