export type SplitNoteResult = {
  first: {
    title: string;
    body: string;
  };
  second: {
    title: string;
    body: string;
  };
};

/**
 * Splits a note's text and title into two distinct notes.
 *
 * If a splitIndex is provided (e.g. cursor or custom position in body), it splits at that offset.
 * Otherwise, it detects explicit delimiters (`---`, `***`, `===`), paragraph breaks (`\n\n`),
 * or splits at the midpoint word boundary.
 */
export function splitNoteContent(
  title: string,
  body: string,
  splitIndex?: number
): SplitNoteResult {
  const cleanTitle = title.trim();
  const cleanBody = body;

  let part1Body = '';
  let part2Body = '';

  if (typeof splitIndex === 'number' && splitIndex >= 0 && splitIndex <= cleanBody.length) {
    part1Body = cleanBody.slice(0, splitIndex).trim();
    part2Body = cleanBody.slice(splitIndex).trim();
  } else {
    // Check for explicit divider like '---', '***', or '==='
    const dividerMatch = cleanBody.match(/\n\s*(-{3,}|\*{3,}|={3,})\s*\n/);
    if (dividerMatch && dividerMatch.index !== undefined) {
      const matchIdx = dividerMatch.index;
      const matchLen = dividerMatch[0].length;
      part1Body = cleanBody.slice(0, matchIdx).trim();
      part2Body = cleanBody.slice(matchIdx + matchLen).trim();
    } else {
      // Split on paragraph break closest to middle
      const paragraphs = cleanBody.split(/\n\n+/);
      if (paragraphs.length > 1) {
        const half = Math.ceil(paragraphs.length / 2);
        part1Body = paragraphs.slice(0, half).join('\n\n').trim();
        part2Body = paragraphs.slice(half).join('\n\n').trim();
      } else {
        // Single paragraph: try splitting by newline or sentences
        const lines = cleanBody.split(/\n+/);
        if (lines.length > 1) {
          const half = Math.ceil(lines.length / 2);
          part1Body = lines.slice(0, half).join('\n').trim();
          part2Body = lines.slice(half).join('\n').trim();
        } else {
          // Words split around the middle
          const words = cleanBody.split(/\s+/);
          if (words.length > 1) {
            const half = Math.ceil(words.length / 2);
            part1Body = words.slice(0, half).join(' ').trim();
            part2Body = words.slice(half).join(' ').trim();
          } else {
            part1Body = cleanBody.trim();
            part2Body = '';
          }
        }
      }
    }
  }

  // Derive titles
  const firstTitle = cleanTitle !== '' ? cleanTitle : 'Part 1';

  let secondTitle = '';
  if (cleanTitle !== '') {
    secondTitle = `${cleanTitle} (Part 2)`;
  } else if (part2Body !== '') {
    // Take first line up to 30 chars
    const firstLine = part2Body.split('\n')[0].trim();
    secondTitle = firstLine.length > 30 ? `${firstLine.slice(0, 30)}…` : firstLine || 'Part 2';
  } else {
    secondTitle = 'Part 2';
  }

  return {
    first: {
      title: firstTitle,
      body: part1Body,
    },
    second: {
      title: secondTitle,
      body: part2Body,
    },
  };
}
