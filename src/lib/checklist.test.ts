import {
  applyMarkdownFormat,
  extractTaskItems,
  getChecklistSummary,
  toggleTaskAtLine,
} from './checklist';

describe('getChecklistSummary', () => {
  test('returns 0s for empty or whitespace-only text', () => {
    expect(getChecklistSummary('')).toEqual({
      total: 0,
      completed: 0,
      remaining: 0,
      progress: 0,
    });
    expect(getChecklistSummary('   \n  \n')).toEqual({
      total: 0,
      completed: 0,
      remaining: 0,
      progress: 0,
    });
  });

  test('returns 0s when no markdown tasks are present', () => {
    const text = 'Just some notes\nWith paragraphs\n- bullet point';
    expect(getChecklistSummary(text)).toEqual({
      total: 0,
      completed: 0,
      remaining: 0,
      progress: 0,
    });
  });

  test('correctly tallies uncompleted and completed tasks', () => {
    const text = [
      '# Grocery List',
      '- [ ] Milk',
      '- [x] Eggs',
      '- [X] Bread',
      '* [ ] Butter',
      'Plain note line',
    ].join('\n');

    expect(getChecklistSummary(text)).toEqual({
      total: 4,
      completed: 2,
      remaining: 2,
      progress: 50,
    });
  });

  test('calculates 100% progress when all tasks are done', () => {
    const text = '- [x] Task 1\n- [x] Task 2';
    expect(getChecklistSummary(text)).toEqual({
      total: 2,
      completed: 2,
      remaining: 0,
      progress: 100,
    });
  });
});

describe('extractTaskItems', () => {
  test('extracts tasks with their line numbers, completion status, and text', () => {
    const text = [
      'Title',
      '- [ ] Incomplete 1',
      'Some text',
      '  - [x] Completed indented',
    ].join('\n');

    const items = extractTaskItems(text);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      lineIndex: 1,
      completed: false,
      indent: '',
      text: 'Incomplete 1',
      raw: '- [ ] Incomplete 1',
    });
    expect(items[1]).toEqual({
      lineIndex: 3,
      completed: true,
      indent: '  ',
      text: 'Completed indented',
      raw: '  - [x] Completed indented',
    });
  });
});

describe('toggleTaskAtLine', () => {
  test('toggles incomplete task to completed', () => {
    const text = 'Intro\n- [ ] Buy apples\nOutro';
    const toggled = toggleTaskAtLine(text, 1);
    expect(toggled).toBe('Intro\n- [x] Buy apples\nOutro');
  });

  test('toggles completed task to incomplete', () => {
    const text = 'Intro\n- [x] Buy apples\nOutro';
    const toggled = toggleTaskAtLine(text, 1);
    expect(toggled).toBe('Intro\n- [ ] Buy apples\nOutro');
  });

  test('preserves indentation when toggling', () => {
    const text = '  - [ ] Nested task';
    const toggled = toggleTaskAtLine(text, 0);
    expect(toggled).toBe('  - [x] Nested task');
  });

  test('does nothing if line is out of bounds or not a task', () => {
    const text = 'Just text\nAnother line';
    expect(toggleTaskAtLine(text, 0)).toBe(text);
    expect(toggleTaskAtLine(text, 99)).toBe(text);
  });
});

describe('applyMarkdownFormat', () => {
  describe('bold and italic formatting', () => {
    test('wraps selected text in bold', () => {
      const text = 'Hello world today';
      // select "world" (index 6 to 11)
      const res = applyMarkdownFormat(text, { start: 6, end: 11 }, 'bold');
      expect(res.text).toBe('Hello **world** today');
      expect(res.selection).toEqual({ start: 6, end: 15 });
    });

    test('unwraps bold if already wrapped', () => {
      const text = 'Hello **world** today';
      const res = applyMarkdownFormat(text, { start: 6, end: 15 }, 'bold');
      expect(res.text).toBe('Hello world today');
      expect(res.selection).toEqual({ start: 6, end: 11 });
    });

    test('inserts empty bold with cursor in middle when nothing is selected', () => {
      const text = 'Hello ';
      const res = applyMarkdownFormat(text, { start: 6, end: 6 }, 'bold');
      expect(res.text).toBe('Hello ****');
      expect(res.selection).toEqual({ start: 8, end: 8 });
    });

    test('wraps selected text in italic', () => {
      const text = 'Hello world';
      const res = applyMarkdownFormat(text, { start: 6, end: 11 }, 'italic');
      expect(res.text).toBe('Hello *world*');
      expect(res.selection).toEqual({ start: 6, end: 13 });
    });
  });

  describe('divider formatting', () => {
    test('inserts horizontal rule at cursor', () => {
      const text = 'Before\nAfter';
      const res = applyMarkdownFormat(text, { start: 7, end: 7 }, 'divider');
      expect(res.text).toBe('Before\n---\nAfter');
    });
  });

  describe('task checklist formatting', () => {
    test('prepends task prefix to a plain line', () => {
      const text = 'Buy milk';
      const res = applyMarkdownFormat(text, { start: 2, end: 2 }, 'task');
      expect(res.text).toBe('- [ ] Buy milk');
    });

    test('toggles - [ ] to - [x]', () => {
      const text = '- [ ] Buy milk';
      const res = applyMarkdownFormat(text, { start: 8, end: 8 }, 'task');
      expect(res.text).toBe('- [x] Buy milk');
    });

    test('toggles - [x] to - [ ]', () => {
      const text = '- [x] Buy milk';
      const res = applyMarkdownFormat(text, { start: 8, end: 8 }, 'task');
      expect(res.text).toBe('- [ ] Buy milk');
    });

    test('converts a bullet point to a task item', () => {
      const text = '- Existing bullet';
      const res = applyMarkdownFormat(text, { start: 4, end: 4 }, 'task');
      expect(res.text).toBe('- [ ] Existing bullet');
    });
  });

  describe('bullet list formatting', () => {
    test('prepends bullet to plain line', () => {
      const text = 'First line';
      const res = applyMarkdownFormat(text, { start: 0, end: 0 }, 'bullet');
      expect(res.text).toBe('- First line');
    });

    test('removes bullet if already present', () => {
      const text = '- First line';
      const res = applyMarkdownFormat(text, { start: 4, end: 4 }, 'bullet');
      expect(res.text).toBe('First line');
    });
  });

  describe('heading formatting', () => {
    test('cycles heading: plain -> # -> ## -> ### -> plain', () => {
      const initial = 'Heading text';
      const h1 = applyMarkdownFormat(initial, { start: 0, end: 0 }, 'heading');
      expect(h1.text).toBe('# Heading text');

      const h2 = applyMarkdownFormat(h1.text, { start: 0, end: 0 }, 'heading');
      expect(h2.text).toBe('## Heading text');

      const h3 = applyMarkdownFormat(h2.text, { start: 0, end: 0 }, 'heading');
      expect(h3.text).toBe('### Heading text');

      const plain = applyMarkdownFormat(h3.text, { start: 0, end: 0 }, 'heading');
      expect(plain.text).toBe('Heading text');
    });
  });

  describe('quote formatting', () => {
    test('prepends > to plain line and removes if present', () => {
      const initial = 'A famous quote';
      const quoted = applyMarkdownFormat(initial, { start: 2, end: 2 }, 'quote');
      expect(quoted.text).toBe('> A famous quote');

      const unquoted = applyMarkdownFormat(quoted.text, { start: 2, end: 2 }, 'quote');
      expect(unquoted.text).toBe('A famous quote');
    });
  });
});
