import { createAutosaver } from '@/lib/autosave';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const flushMicrotasks = () => Promise.resolve();

describe('createAutosaver', () => {
  test('starts idle', () => {
    expect(createAutosaver({ save: jest.fn() }).status()).toBe('idle');
  });

  test('does not save before the delay elapses', () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 600 });

    saver.change('a');
    jest.advanceTimersByTime(599);

    expect(save).not.toHaveBeenCalled();
  });

  test('saves once the delay elapses', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 600 });

    saver.change('hello');
    jest.advanceTimersByTime(600);
    await flushMicrotasks();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('hello');
  });

  test('coalesces a burst of changes into one save with the latest value', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 600 });

    saver.change('h');
    jest.advanceTimersByTime(100);
    saver.change('he');
    jest.advanceTimersByTime(100);
    saver.change('hello');
    jest.advanceTimersByTime(600);
    await flushMicrotasks();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('hello');
  });

  test('reports saved after a successful write', async () => {
    const saver = createAutosaver({ save: jest.fn().mockResolvedValue(undefined), delay: 10 });

    saver.change('x');
    jest.advanceTimersByTime(10);
    await flushMicrotasks();

    expect(saver.status()).toBe('saved');
  });

  test('flush writes immediately without waiting for the delay', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 10_000 });

    saver.change('urgent');
    await saver.flush();

    expect(save).toHaveBeenCalledWith('urgent');
    expect(saver.status()).toBe('saved');
  });

  test('flush with no pending change does not call save', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 10 });

    await saver.flush();

    expect(save).not.toHaveBeenCalled();
  });

  test('flush cancels the pending timer so the value is not saved twice', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 600 });

    saver.change('once');
    await saver.flush();
    jest.advanceTimersByTime(600);
    await flushMicrotasks();

    expect(save).toHaveBeenCalledTimes(1);
  });

  test('reports unsaved when the write fails and keeps the value for retry', async () => {
    const save = jest.fn()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValueOnce(undefined);
    const saver = createAutosaver({ save, delay: 10 });

    saver.change('keep me');
    jest.advanceTimersByTime(10);
    await flushMicrotasks();
    expect(saver.status()).toBe('unsaved');

    await saver.flush();
    expect(save).toHaveBeenLastCalledWith('keep me');
    expect(saver.status()).toBe('saved');
  });

  test('notifies subscribers of status transitions', async () => {
    const seen: string[] = [];
    const saver = createAutosaver({ save: jest.fn().mockResolvedValue(undefined), delay: 10 });
    saver.subscribe((s) => seen.push(s));

    saver.change('x');
    jest.advanceTimersByTime(10);
    await flushMicrotasks();

    expect(seen).toEqual(['saving', 'saved']);
  });

  test('unsubscribe stops notifications', async () => {
    const seen: string[] = [];
    const saver = createAutosaver({ save: jest.fn().mockResolvedValue(undefined), delay: 10 });
    const off = saver.subscribe((s) => seen.push(s));

    off();
    saver.change('x');
    jest.advanceTimersByTime(10);
    await flushMicrotasks();

    expect(seen).toEqual([]);
  });

  test('dispose cancels a pending save', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 600 });

    saver.change('never');
    saver.dispose();
    jest.advanceTimersByTime(600);
    await flushMicrotasks();

    expect(save).not.toHaveBeenCalled();
  });
});
