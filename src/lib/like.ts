export const LIKE_ESCAPE_CHAR = '\\';

/**
 * Escapes SQL LIKE wildcards so user input matches literally — without this,
 * searching for "100%" would match every note.
 *
 * The escape character must be replaced first, or the later replacements would
 * double-escape the backslashes this function itself inserts.
 * Pair with: LIKE ? ESCAPE '\'
 */
export function escapeLike(query: string): string {
  return query
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
