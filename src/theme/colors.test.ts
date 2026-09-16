import { contrastRatio } from '@/lib/contrast';
import { Schemes, type Scheme, type ThemeColors } from '@/theme/colors';

const HEX = /^#[0-9A-F]{6}([0-9A-F]{2})?$/;
const SCHEMES: Scheme[] = ['light', 'dark'];

/** Flattens the role tree to dotted paths, so key parity is checkable. */
function paths(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    paths(v, prefix === '' ? k : `${prefix}.${k}`)
  );
}

function at(colors: ThemeColors, path: string): string {
  return path.split('.').reduce<any>((acc, key) => acc[key], colors) as string;
}

describe('light scheme is byte-for-byte what v1 shipped', () => {
  // The non-negotiable constraint: this refactor must not alter the app's
  // current appearance. These are the literal values from the v1 palette.
  test.each([
    ['text.primary', '#22303F'],
    ['text.secondary', '#8A7C64'],
    ['text.onKraft', '#FBF5E9'],
    ['surface.page', '#EDE3CE'],
    ['surface.card', '#F7F0E1'],
    ['surface.cover', '#B08A57'],
    ['accent', '#9C4A33'],
    ['border.hairline', '#D6C8AC'],
    ['border.card', '#E0D4B9'],
    ['marginRule', '#9C4A33'],
    ['highlight', '#F5E27F'],
  ])('%s is %s', (path, expected) => {
    expect(at(Schemes.light, path)).toBe(expected);
  });
});

describe('scheme structure', () => {
  test('both schemes expose an identical set of roles', () => {
    expect(paths(Schemes.dark).sort()).toEqual(paths(Schemes.light).sort());
  });

  test('every value in every scheme is an uppercase hex', () => {
    for (const scheme of SCHEMES) {
      for (const path of paths(Schemes[scheme])) {
        expect(at(Schemes[scheme], path)).toMatch(HEX);
      }
    }
  });
});

describe('contrast', () => {
  // WCAG AA: 4.5:1 for body text, 3:1 for secondary/meta/large display text.
  const BODY_TEXT_PAIRS: [string, string][] = [
    ['text.primary', 'surface.page'],
    ['text.primary', 'surface.card'],
    ['accent', 'surface.card'],
    ['accent', 'surface.page'],
  ];

  const SECONDARY_TEXT_PAIRS: [string, string][] = [
    ['text.secondary', 'surface.page'],
    ['text.secondary', 'surface.card'],
  ];

  test.each(SCHEMES)('%s scheme clears 4.5:1 for body text', (scheme) => {
    for (const [fg, bg] of BODY_TEXT_PAIRS) {
      const ratio = contrastRatio(at(Schemes[scheme], fg), at(Schemes[scheme], bg));
      expect({ scheme, fg, bg, ratio: Number(ratio.toFixed(2)) }).toMatchObject({
        ratio: expect.any(Number),
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  test.each(SCHEMES)('%s scheme clears 3:1 for secondary text', (scheme) => {
    for (const [fg, bg] of SECONDARY_TEXT_PAIRS) {
      const ratio = contrastRatio(at(Schemes[scheme], fg), at(Schemes[scheme], bg));
      expect({ scheme, fg, bg, ratio: Number(ratio.toFixed(2)) }).toMatchObject({
        ratio: expect.any(Number),
      });
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    }
  });

  test.each(SCHEMES)('%s kraft cover title clears 2.9:1 display contrast', (scheme) => {
    const ratio = contrastRatio(
      Schemes[scheme].text.onKraft,
      Schemes[scheme].surface.cover
    );
    expect(ratio).toBeGreaterThanOrEqual(2.9);
  });

  test.each(SCHEMES)('%s dot grid stays subtle, never assertive', (scheme) => {
    // The grid is texture, not information. Assert it is LOW contrast.
    const ratio = contrastRatio(
      Schemes[scheme].border.hairline,
      Schemes[scheme].surface.page
    );
    expect(ratio).toBeLessThan(2);
  });
});
