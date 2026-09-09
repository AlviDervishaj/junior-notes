const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

const pad = (n: number) => String(n).padStart(2, '0');
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Relative date in the Kraft & Ink voice:
 *   today          -> "TODAY 14:32"
 *   within 6 days  -> "TUE 08:15"
 *   this year      -> "12 AUG"
 *   earlier year   -> "12 AUG 25"
 *
 * Buckets by calendar day, not by 24-hour spans, so a note written at 00:01
 * today reads TODAY rather than yesterday's weekday.
 */
export function formatNoteDate(ts: number, now: number): string {
  const then = new Date(ts);
  const today = new Date(now);
  const dayDiff = Math.round((startOfDay(today) - startOfDay(then)) / 86_400_000);
  const time = `${pad(then.getHours())}:${pad(then.getMinutes())}`;

  if (dayDiff <= 0) return `TODAY ${time}`;
  if (dayDiff < 7) return `${WEEKDAYS[then.getDay()]} ${time}`;

  const date = `${then.getDate()} ${MONTHS[then.getMonth()]}`;
  if (then.getFullYear() === today.getFullYear()) return date;
  return `${date} ${pad(then.getFullYear() % 100)}`;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}
