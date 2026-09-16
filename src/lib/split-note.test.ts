import { splitNoteContent } from './split-note';

describe('splitNoteContent', () => {
  test('splits by explicit divider ---', () => {
    const title = 'Meeting Notes';
    const body = 'Agenda item 1\n---\nAction items for team';
    const result = splitNoteContent(title, body);

    expect(result.first.title).toBe('Meeting Notes');
    expect(result.first.body).toBe('Agenda item 1');
    expect(result.second.title).toBe('Meeting Notes (Part 2)');
    expect(result.second.body).toBe('Action items for team');
  });

  test('splits by paragraph break when no divider is present', () => {
    const title = 'Recipe';
    const body = 'Ingredients:\n- Flour\n- Milk\n\nInstructions:\n1. Mix\n2. Bake';
    const result = splitNoteContent(title, body);

    expect(result.first.title).toBe('Recipe');
    expect(result.first.body).toBe('Ingredients:\n- Flour\n- Milk');
    expect(result.second.title).toBe('Recipe (Part 2)');
    expect(result.second.body).toBe('Instructions:\n1. Mix\n2. Bake');
  });

  test('splits at a specific index if provided', () => {
    const title = 'Quick Draft';
    const body = 'First part of text. Second part of text.';
    const splitIndex = 19; // after 'First part of text.'
    const result = splitNoteContent(title, body, splitIndex);

    expect(result.first.body).toBe('First part of text.');
    expect(result.second.body).toBe('Second part of text.');
  });

  test('handles empty title by using sensible fallback titles', () => {
    const body = 'First paragraph\n\nSecond paragraph';
    const result = splitNoteContent('', body);

    expect(result.first.title).toBe('Part 1');
    expect(result.second.title).toBe('Second paragraph');
  });

  test('handles single line text gracefully', () => {
    const result = splitNoteContent('Short', 'Hello world');
    expect(result.first.body).toBe('Hello');
    expect(result.second.body).toBe('world');
  });
});
