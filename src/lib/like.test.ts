import { escapeLike, LIKE_ESCAPE_CHAR } from '@/lib/like';

describe('escapeLike', () => {
  test('leaves ordinary text alone', () => {
    expect(escapeLike('coffee')).toBe('coffee');
  });

  test('escapes percent so it matches literally', () => {
    expect(escapeLike('100%')).toBe('100\\%');
  });

  test('escapes underscore so it matches literally', () => {
    expect(escapeLike('a_b')).toBe('a\\_b');
  });

  test('escapes the escape character itself, first', () => {
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  test('handles a string of only wildcards', () => {
    expect(escapeLike('%_%')).toBe('\\%\\_\\%');
  });

  test('exposes the escape character used', () => {
    expect(LIKE_ESCAPE_CHAR).toBe('\\');
  });
});
