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
