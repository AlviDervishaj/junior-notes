import { countWords, formatDaysRemaining, formatNoteDate } from '@/lib/format-date';

// Fixed clock: Wednesday 9 September 2026, 14:32 local time.
const NOW = new Date(2026, 8, 9, 14, 32, 0).getTime();
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m, d, h, min).getTime();

describe('formatNoteDate', () => {
  test('today shows TODAY and the time', () => {
    expect(formatNoteDate(at(2026, 8, 9, 14, 32), NOW)).toBe('TODAY 14:32');
  });

  test('earlier today still shows TODAY', () => {
    expect(formatNoteDate(at(2026, 8, 9, 0, 5), NOW)).toBe('TODAY 00:05');
  });

  test('yesterday shows the weekday and time', () => {
    expect(formatNoteDate(at(2026, 8, 8, 8, 15), NOW)).toBe('TUE 08:15');
  });

  test('six days ago still shows the weekday', () => {
    expect(formatNoteDate(at(2026, 8, 3, 9, 0), NOW)).toBe('THU 09:00');
  });

  test('seven days ago falls back to the date', () => {
    expect(formatNoteDate(at(2026, 8, 2, 9, 0), NOW)).toBe('2 SEP');
  });

  test('earlier this year shows day and month', () => {
    expect(formatNoteDate(at(2026, 7, 12), NOW)).toBe('12 AUG');
  });

  test('a previous year includes the two-digit year', () => {
    expect(formatNoteDate(at(2025, 7, 12), NOW)).toBe('12 AUG 25');
  });

  test('a timestamp one minute after midnight today is TODAY, not yesterday', () => {
    expect(formatNoteDate(at(2026, 8, 9, 0, 1), NOW)).toBe('TODAY 00:01');
  });

  test('a future timestamp is treated as today rather than crashing', () => {
    expect(formatNoteDate(at(2026, 8, 9, 23, 59), NOW)).toBe('TODAY 23:59');
  });
});

describe('countWords', () => {
  test.each([
    ['', 0],
    ['   ', 0],
    ['one', 1],
    ['two words', 2],
    ['  leading and trailing  ', 3],
    ['line\nbreaks\ncount', 3],
    ['multiple   spaces', 2],
  ])('counts %j as %i', (input, expected) => {
    expect(countWords(input as string)).toBe(expected);
  });
});

describe('formatDaysRemaining', () => {
  const DAY = 86_400_000;
  test('returns 30 days left immediately after deletion', () => {
    expect(formatDaysRemaining(NOW, NOW)).toBe('30 DAYS LEFT');
  });

  test('returns 20 days left after 10 days', () => {
    expect(formatDaysRemaining(NOW - 10 * DAY, NOW)).toBe('20 DAYS LEFT');
  });

  test('returns 1 day left on the final day', () => {
    expect(formatDaysRemaining(NOW - 29.5 * DAY, NOW)).toBe('1 DAY LEFT');
  });

  test('returns 1 day left when time expired', () => {
    expect(formatDaysRemaining(NOW - 31 * DAY, NOW)).toBe('1 DAY LEFT');
  });
});
