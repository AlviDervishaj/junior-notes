import { CATEGORIES, categoryById } from '@/theme/categories';
import { Palette, PaletteDark, Schemes } from '@/theme/colors';
import { Layout } from '@/theme/layout';

const HEX = /^#[0-9A-F]{6}([0-9A-F]{2})?$/;

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

  test('every value is an uppercase 6-digit or 8-digit hex', () => {
    for (const value of Object.values(Palette)) expect(value).toMatch(HEX);
    for (const value of Object.values(PaletteDark)) expect(value).toMatch(HEX);
  });
});

describe('semantic roles', () => {
  test('light roles resolve to values present in the light palette', () => {
    const known = new Set<string>(Object.values(Palette));
    const roles = [
      Schemes.light.text.primary, Schemes.light.text.secondary, Schemes.light.text.onKraft,
      Schemes.light.surface.page, Schemes.light.surface.card, Schemes.light.surface.cover,
      Schemes.light.accent, Schemes.light.border.hairline, Schemes.light.highlight,
    ];
    for (const role of roles) expect(known.has(role)).toBe(true);
  });

  test('dark roles resolve to values present in the dark palette', () => {
    const known = new Set<string>(Object.values(PaletteDark));
    const roles = [
      Schemes.dark.text.primary, Schemes.dark.text.secondary, Schemes.dark.text.onKraft,
      Schemes.dark.surface.page, Schemes.dark.surface.card, Schemes.dark.surface.cover,
      Schemes.dark.accent, Schemes.dark.border.hairline, Schemes.dark.highlight,
    ];
    for (const role of roles) expect(known.has(role)).toBe(true);
  });
});

describe('categories', () => {
  test('are the four approved categories with the approved colours', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual(['lists', 'home', 'ideas', 'notes']);
    expect(CATEGORIES.map((c) => c.colors.light)).toEqual(['#D69B26', '#2F6C69', '#9C4A33', '#A6AC8A']);
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
