import { contrastRatio } from '@/lib/contrast';
import { CATEGORIES, categoryById } from '@/theme/categories';
import { Schemes } from '@/theme/colors';

describe('category colours', () => {
  test('light values are unchanged from v1', () => {
    expect(CATEGORIES.map((c) => c.colors.light)).toEqual([
      '#D69B26',
      '#2F6C69',
      '#9C4A33',
      '#A6AC8A',
    ]);
  });

  test('every category defines a colour for every scheme', () => {
    for (const category of CATEGORIES) {
      for (const scheme of ['light', 'dark'] as const) {
        expect(category.colors[scheme]).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  // A category square is a meaningful graphic, so WCAG asks 3:1 against the
  // surface it sits on. Squares render on cards.
  test('dark squares clear 3:1 against the dark card', () => {
    for (const category of CATEGORIES) {
      const ratio = contrastRatio(category.colors.dark, Schemes.dark.surface.card);
      expect(ratio).toBeGreaterThanOrEqual(3);
    }
  });

  test('light squares clear 2:1 against the light card', () => {
    for (const category of CATEGORIES) {
      const ratio = contrastRatio(category.colors.light, Schemes.light.surface.card);
      expect(ratio).toBeGreaterThanOrEqual(2);
    }
  });

  test('categoryById still resolves and still returns null for unknowns', () => {
    expect(categoryById('home')?.label).toBe('Home');
    expect(categoryById(null)).toBeNull();
    expect(categoryById('nope')).toBeNull();
  });
});
