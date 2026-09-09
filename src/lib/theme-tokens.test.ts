import { CATEGORIES, categoryById } from '@/theme/categories';
import { Colors, Palette } from '@/theme/colors';
import { Layout } from '@/theme/layout';

const HEX = /^#[0-9A-F]{6}$/;

describe('palette', () => {
  test('matches the approved Kraft & Ink values', () => {
    expect(Palette.kraft).toBe('#B08A57');
    expect(Palette.paper).toBe('#EDE3CE');
    expect(Palette.card).toBe('#F7F0E1');
    expect(Palette.ink).toBe('#22303F');
    expect(Palette.brick).toBe('#9C4A33');
    expect(Palette.dim).toBe('#8A7C64');
    expect(Palette.rule).toBe('#D6C8AC');
  });

  test('every value is an uppercase 6-digit hex', () => {
    for (const value of Object.values(Palette)) expect(value).toMatch(HEX);
  });
});

describe('semantic roles', () => {
  test('resolve to values present in the palette', () => {
    const known = new Set<string>(Object.values(Palette));
    const roles = [
      Colors.text.primary, Colors.text.secondary, Colors.text.onKraft,
      Colors.surface.page, Colors.surface.card, Colors.surface.cover,
      Colors.accent, Colors.border.hairline,
    ];
    for (const role of roles) expect(known.has(role)).toBe(true);
  });

  test('there is no dark variant', () => {
    expect(Colors).not.toHaveProperty('dark');
  });
});

describe('categories', () => {
  test('are the four approved categories with the approved colours', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual(['lists', 'home', 'ideas', 'notes']);
    expect(CATEGORIES.map((c) => c.color)).toEqual(['#D69B26', '#2F6C69', '#9C4A33', '#A6AC8A']);
  });

  test('ids are unique', () => {
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length);
  });

  test('categoryById finds a category', () => {
    expect(categoryById('home')?.label).toBe('Home');
  });

  test('categoryById returns null for null and for unknown ids', () => {
    expect(categoryById(null)).toBeNull();
    expect(categoryById('nope')).toBeNull();
  });
});

describe('layout', () => {
  test('no radius exceeds 4px', () => {
    for (const value of Object.values(Layout.radius)) expect(value).toBeLessThanOrEqual(4);
  });

  test('dot spacing matches the design', () => {
    expect(Layout.dotSpacing).toBe(11);
  });
});
