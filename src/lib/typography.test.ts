import { FontFamily, Type } from '@/theme/typography';

describe('font families', () => {
  test('are the four bundled faces', () => {
    expect(FontFamily).toEqual({
      chrome: 'Jost_400Regular',
      chromeMedium: 'Jost_500Medium',
      body: 'CourierPrime_400Regular',
      bodyBold: 'CourierPrime_700Bold',
    });
  });
});

describe('type scale', () => {
  test('every style declares a bundled font family and a positive size', () => {
    const bundled = new Set<string>(Object.values(FontFamily));
    for (const style of Object.values(Type)) {
      expect(bundled.has(style.fontFamily as string)).toBe(true);
      expect(typeof style.fontSize === 'number' && style.fontSize > 0).toBe(true);
    }
  });

  test('note body uses the typewriter face at generous line height', () => {
    expect(Type.bodyText.fontFamily).toBe(FontFamily.body);
    expect(Type.bodyText.lineHeight! / Type.bodyText.fontSize!).toBeGreaterThanOrEqual(1.8);
  });

  test('chrome labels use the geometric sans with wide tracking', () => {
    expect(Type.stampLabel.fontFamily).toBe(FontFamily.chromeMedium);
    expect(Type.stampLabel.letterSpacing).toBeGreaterThanOrEqual(1);
    expect(Type.tabLabel.letterSpacing).toBeGreaterThanOrEqual(0.8);
  });

  test('metadata uses the typewriter face, matching the mockup', () => {
    expect(Type.metaLabel.fontFamily).toBe(FontFamily.body);
  });
});
