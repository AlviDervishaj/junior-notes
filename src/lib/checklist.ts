export type MarkdownAction =
  | 'task'
  | 'bullet'
  | 'numbered'
  | 'heading'
  | 'bold'
  | 'italic'
  | 'quote'
  | 'divider';

export type TaskItem = {
  lineIndex: number;
  completed: boolean;
  indent: string;
  text: string;
  raw: string;
};

export type ChecklistSummary = {
  total: number;
  completed: number;
  remaining: number;
  progress: number;
};

const TASK_REGEX = /^(\s*)[-*+]\s+\[([ xX])\]\s*(.*)$/;
const BULLET_REGEX = /^(\s*)[-*+]\s+(.*)$/;
const NUMBERED_REGEX = /^(\s*)\d+\.\s+(.*)$/;
const HEADING_REGEX = /^(#{1,6})\s+(.*)$/;
const QUOTE_REGEX = /^(\s*)>\s+(.*)$/;

/**
 * Extracts and summarizes all checklist task items from note body markdown.
 */
export function getChecklistSummary(body: string): ChecklistSummary {
  if (!body || body.trim() === '') {
    return { total: 0, completed: 0, remaining: 0, progress: 0 };
  }

  const lines = body.split('\n');
  let total = 0;
  let completed = 0;

  for (const line of lines) {
    const match = line.match(TASK_REGEX);
    if (match) {
      total += 1;
      const checkMark = match[2];
      if (checkMark === 'x' || checkMark === 'X') {
        completed += 1;
      }
    }
  }

  if (total === 0) {
    return { total: 0, completed: 0, remaining: 0, progress: 0 };
  }

  const remaining = total - completed;
  const progress = Math.round((completed / total) * 100);

  return { total, completed, remaining, progress };
}

/**
 * Parses all checklist items with line indices for interactive list rendering.
 */
export function extractTaskItems(body: string): TaskItem[] {
  if (!body) return [];

  const lines = body.split('\n');
  const items: TaskItem[] = [];

  lines.forEach((line, lineIndex) => {
    const match = line.match(TASK_REGEX);
    if (match) {
      const indent = match[1];
      const checkMark = match[2];
      const text = match[3];
      items.push({
        lineIndex,
        completed: checkMark.toLowerCase() === 'x',
        indent,
        text,
        raw: line,
      });
    }
  });

  return items;
}

/**
 * Toggles a checklist item at a specific line index between `- [ ]` and `- [x]`.
 */
export function toggleTaskAtLine(body: string, targetLineIndex: number): string {
  const lines = body.split('\n');
  if (targetLineIndex < 0 || targetLineIndex >= lines.length) return body;

  const line = lines[targetLineIndex];
  const match = line.match(TASK_REGEX);
  if (!match) return body;

  const indent = match[1];
  const checkMark = match[2];
  const rest = match[3];

  const nextCheck = checkMark.toLowerCase() === 'x' ? ' ' : 'x';
  lines[targetLineIndex] = `${indent}- [${nextCheck}] ${rest}`;

  return lines.join('\n');
}

/**
 * Applies a markdown formatting action to the text based on current cursor selection.
 * Returns the transformed text and new selection offsets.
 */
export function applyMarkdownFormat(
  text: string,
  selection: { start: number; end: number } = { start: 0, end: 0 },
  action: MarkdownAction
): { text: string; selection: { start: number; end: number } } {
  const { start, end } = selection;
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(0, Math.min(end, text.length));
  const selStart = Math.min(safeStart, safeEnd);
  const selEnd = Math.max(safeStart, safeEnd);

  // In-line wrapping formats (bold, italic)
  if (action === 'bold') {
    if (selStart !== selEnd) {
      const selected = text.slice(selStart, selEnd);
      if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
        // Unwrap bold
        const unwrapped = selected.slice(2, -2);
        const nextText = text.slice(0, selStart) + unwrapped + text.slice(selEnd);
        return { text: nextText, selection: { start: selStart, end: selStart + unwrapped.length } };
      } else {
        // Wrap in bold
        const wrapped = `**${selected}**`;
        const nextText = text.slice(0, selStart) + wrapped + text.slice(selEnd);
        return { text: nextText, selection: { start: selStart, end: selStart + wrapped.length } };
      }
    } else {
      // Insert empty bold markers and put cursor in middle
      const nextText = text.slice(0, selStart) + '****' + text.slice(selEnd);
      return { text: nextText, selection: { start: selStart + 2, end: selStart + 2 } };
    }
  }

  if (action === 'italic') {
    if (selStart !== selEnd) {
      const selected = text.slice(selStart, selEnd);
      if (selected.startsWith('*') && selected.endsWith('*') && selected.length >= 2 && !selected.startsWith('**')) {
        const unwrapped = selected.slice(1, -1);
        const nextText = text.slice(0, selStart) + unwrapped + text.slice(selEnd);
        return { text: nextText, selection: { start: selStart, end: selStart + unwrapped.length } };
      } else {
        const wrapped = `*${selected}*`;
        const nextText = text.slice(0, selStart) + wrapped + text.slice(selEnd);
        return { text: nextText, selection: { start: selStart, end: selStart + wrapped.length } };
      }
    } else {
      const nextText = text.slice(0, selStart) + '**' + text.slice(selEnd);
      return { text: nextText, selection: { start: selStart + 1, end: selStart + 1 } };
    }
  }

  if (action === 'divider') {
    const prefix = selStart > 0 && text[selStart - 1] !== '\n' ? '\n' : '';
    const insertion = `${prefix}---\n`;
    const nextText = text.slice(0, selStart) + insertion + text.slice(selEnd);
    const newPos = selStart + insertion.length;
    return { text: nextText, selection: { start: newPos, end: newPos } };
  }

  // Line-based formats (task, bullet, numbered, heading, quote)
  const before = text.slice(0, selStart);
  const lineStartOffset = before.lastIndexOf('\n') + 1;
  const after = text.slice(selEnd);
  const nextNewlineOffset = after.indexOf('\n');
  const lineEndOffset = nextNewlineOffset === -1 ? text.length : selEnd + nextNewlineOffset;

  const currentLine = text.slice(lineStartOffset, lineEndOffset);
  let transformedLine = currentLine;

  switch (action) {
    case 'task': {
      const taskMatch = currentLine.match(TASK_REGEX);
      if (taskMatch) {
        const indent = taskMatch[1];
        const check = taskMatch[2];
        const content = taskMatch[3];
        if (check.toLowerCase() === 'x') {
          // [x] -> [ ]
          transformedLine = `${indent}- [ ] ${content}`;
        } else {
          // [ ] -> [x]
          transformedLine = `${indent}- [x] ${content}`;
        }
      } else {
        const bulletMatch = currentLine.match(BULLET_REGEX);
        if (bulletMatch) {
          transformedLine = `${bulletMatch[1]}- [ ] ${bulletMatch[2]}`;
        } else {
          const numMatch = currentLine.match(NUMBERED_REGEX);
          if (numMatch) {
            transformedLine = `${numMatch[1]}- [ ] ${numMatch[2]}`;
          } else {
            transformedLine = `- [ ] ${currentLine}`;
          }
        }
      }
      break;
    }

    case 'bullet': {
      const taskMatch = currentLine.match(TASK_REGEX);
      if (taskMatch) {
        transformedLine = `${taskMatch[1]}- ${taskMatch[3]}`;
      } else {
        const bulletMatch = currentLine.match(BULLET_REGEX);
        if (bulletMatch) {
          // Toggle off bullet
          transformedLine = `${bulletMatch[1]}${bulletMatch[2]}`;
        } else {
          transformedLine = `- ${currentLine}`;
        }
      }
      break;
    }

    case 'numbered': {
      const numMatch = currentLine.match(NUMBERED_REGEX);
      if (numMatch) {
        // Toggle off numbered
        transformedLine = `${numMatch[1]}${numMatch[2]}`;
      } else {
        const bulletMatch = currentLine.match(BULLET_REGEX);
        if (bulletMatch) {
          transformedLine = `${bulletMatch[1]}1. ${bulletMatch[2]}`;
        } else {
          transformedLine = `1. ${currentLine}`;
        }
      }
      break;
    }

    case 'heading': {
      const headingMatch = currentLine.match(HEADING_REGEX);
      if (headingMatch) {
        const hashes = headingMatch[1];
        const content = headingMatch[2];
        if (hashes === '#') {
          transformedLine = `## ${content}`;
        } else if (hashes === '##') {
          transformedLine = `### ${content}`;
        } else {
          // Reset to plain text
          transformedLine = content;
        }
      } else {
        transformedLine = `# ${currentLine}`;
      }
      break;
    }

    case 'quote': {
      const quoteMatch = currentLine.match(QUOTE_REGEX);
      if (quoteMatch) {
        transformedLine = `${quoteMatch[1]}${quoteMatch[2]}`;
      } else {
        transformedLine = `> ${currentLine}`;
      }
      break;
    }
  }

  const nextText = text.slice(0, lineStartOffset) + transformedLine + text.slice(lineEndOffset);
  const lengthDiff = transformedLine.length - currentLine.length;
  const newStart = Math.max(0, selStart + lengthDiff);
  const newEnd = Math.max(0, selEnd + lengthDiff);

  return { text: nextText, selection: { start: newStart, end: newEnd } };
}
