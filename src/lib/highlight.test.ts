import { splitOnMatch } from '@/lib/highlight';

describe('splitOnMatch', () => {
  test('returns one unmatched segment when the query is empty', () => {
    expect(splitOnMatch('hello', '')).toEqual([{ text: 'hello', match: false }]);
  });

  test('splits around a single match', () => {
    expect(splitOnMatch('the good coffee', 'good')).toEqual([
      { text: 'the ', match: false },
      { text: 'good', match: true },
      { text: ' coffee', match: false },
    ]);
  });

  test('matches case-insensitively but preserves the original casing', () => {
    expect(splitOnMatch('Grocery List', 'grocery')).toEqual([
      { text: 'Grocery', match: true },
      { text: ' List', match: false },
    ]);
  });

  test('splits around every occurrence', () => {
    expect(splitOnMatch('aXaXa', 'x')).toEqual([
      { text: 'a', match: false },
      { text: 'X', match: true },
      { text: 'a', match: false },
      { text: 'X', match: true },
      { text: 'a', match: false },
    ]);
  });

  test('handles a match spanning the whole string', () => {
    expect(splitOnMatch('abc', 'abc')).toEqual([{ text: 'abc', match: true }]);
  });

  test('returns the whole string unmatched when there is no match', () => {
    expect(splitOnMatch('hello', 'zzz')).toEqual([{ text: 'hello', match: false }]);
  });

  test('treats regex metacharacters in the query literally', () => {
    expect(splitOnMatch('cost is 100% today', '100%')).toEqual([
      { text: 'cost is ', match: false },
      { text: '100%', match: true },
      { text: ' today', match: false },
    ]);
    expect(splitOnMatch('a.b', '.')).toEqual([
      { text: 'a', match: false },
      { text: '.', match: true },
      { text: 'b', match: false },
    ]);
  });

  test('does not throw on a query of only regex specials', () => {
    expect(splitOnMatch('plain text', '(*)')).toEqual([{ text: 'plain text', match: false }]);
  });

  test('handles an empty subject string', () => {
    expect(splitOnMatch('', 'x')).toEqual([{ text: '', match: false }]);
  });
});
