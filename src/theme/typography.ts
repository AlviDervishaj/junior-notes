import type { TextStyle } from 'react-native';

/**
 * Bundled faces. Keys are roles; values are the exact family names the
 * @expo-google-fonts packages register.
 *
 * Jost stands in for Futura and Courier Prime for Courier: iOS ships both
 * originals but Android ships neither, so they are bundled for consistency.
 */
export const FontFamily = {
  chrome: 'Jost_400Regular',
  chromeMedium: 'Jost_500Medium',
  body: 'CourierPrime_400Regular',
  bodyBold: 'CourierPrime_700Bold',
} as const;

/** Type scale from spec §5.2. Letter-spacing carries the period character. */
export const Type = {
  coverTitle: { fontFamily: FontFamily.chromeMedium, fontSize: 20, letterSpacing: 0.2 },
  screenTitle: { fontFamily: FontFamily.chromeMedium, fontSize: 17, letterSpacing: 0.1 },
  cardTitle: { fontFamily: FontFamily.chromeMedium, fontSize: 15, letterSpacing: 0.1 },
  stampLabel: { fontFamily: FontFamily.chromeMedium, fontSize: 9, letterSpacing: 1.4 },
  tabLabel: { fontFamily: FontFamily.chromeMedium, fontSize: 9, letterSpacing: 0.9 },
  metaLabel: { fontFamily: FontFamily.body, fontSize: 9, letterSpacing: 0.8 },
  excerpt: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 18 },
  bodyText: { fontFamily: FontFamily.body, fontSize: 15, lineHeight: 28 },
} satisfies Record<string, TextStyle>;
