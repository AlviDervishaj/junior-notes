import { contrastRatio, relativeLuminance } from '@/lib/contrast';

describe('relativeLuminance', () => {
  test('white is 1 and black is 0', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  test('ignores an alpha suffix', () => {
    expect(relativeLuminance('#FFFFFF80')).toBeCloseTo(relativeLuminance('#FFFFFF'), 5);
  });
});

describe('contrastRatio', () => {
  test('black on white is the maximum 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  test('is symmetric in its arguments', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 2);
  });

  test('a colour against itself is 1:1', () => {
    expect(contrastRatio('#B08A57', '#B08A57')).toBeCloseTo(1, 5);
  });

  // Anchor against a value from the WCAG reference implementation.
  test('#777777 on white is about 4.48:1', () => {
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });

  test('rejects a malformed hex', () => {
    expect(() => contrastRatio('B08A57', '#FFFFFF')).toThrow(/hex/i);
  });
});
