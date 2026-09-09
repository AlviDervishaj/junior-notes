export type Segment = { text: string; match: boolean };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Splits text into matched and unmatched runs for search highlighting.
 * The query is regex-escaped, so metacharacters match literally and a query
 * like "(*)" cannot throw.
 */
export function splitOnMatch(text: string, query: string): Segment[] {
  const needle = query.trim();
  if (needle === '' || text === '') return [{ text, match: false }];

  const pattern = new RegExp(`(${escapeRegExp(needle)})`, 'gi');
  const parts = text.split(pattern).filter((part) => part !== '');

  if (parts.length === 0) return [{ text, match: false }];

  const lowerNeedle = needle.toLowerCase();
  return parts.map((part) => ({ text: part, match: part.toLowerCase() === lowerNeedle }));
}
