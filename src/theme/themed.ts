import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { Schemes, type Scheme, type ThemeColors } from './colors';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/** The system appearance, with light as the fallback when it is unknown or unspecified. */
export function useScheme(): Scheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

/**
 * Builds one StyleSheet per scheme at module load and returns a hook that
 * picks between them.
 *
 * Both sheets are created once, at import — StyleSheet.create is the thing
 * that made dark mode a refactor rather than a palette swap, because it runs
 * at module evaluation and freezes whatever colours it sees. Calling it twice
 * up front keeps that cost where it already was, and reduces switching to an
 * object lookup that allocates nothing per render.
 */
export function makeThemedStyles<T extends NamedStyles>(
  factory: (c: ThemeColors) => T
): () => T {
  const sheets: Record<Scheme, T> = {
    light: StyleSheet.create(factory(Schemes.light)),
    dark: StyleSheet.create(factory(Schemes.dark)),
  };

  return function useStyles(): T {
    return sheets[useScheme()];
  };
}
