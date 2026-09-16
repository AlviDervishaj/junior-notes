import { ImageBackground, type ViewProps } from 'react-native';

import { makeThemedStyles, useScheme } from '@/theme';

// Static literals: Metro resolves require() at build time, so the source
// cannot be an interpolated filename.
const TILE = {
  light: require('@/assets/images/dot-grid.png'),
  dark: require('@/assets/images/dot-grid-dark.png'),
};

/**
 * Dot-grid paper. The grid is a repeating tile because React Native has no
 * radial-gradient and a View per dot would be thousands of nodes.
 *
 * The dot colour is baked into the PNG, so dark mode needs a second tile set
 * rather than a tint: the tile is RGBA with a feathered alpha edge, and tint
 * behaviour over partial alpha is inconsistent across platforms.
 */
export function Paper({ style, children, ...rest }: ViewProps) {
  const styles = useStyles();
  const scheme = useScheme();

  return (
    <ImageBackground
      source={TILE[scheme]}
      resizeMode="repeat"
      style={[styles.paper, style]}
      {...rest}>
      {children}
    </ImageBackground>
  );
}

const useStyles = makeThemedStyles((c) => ({
  paper: { flex: 1, backgroundColor: c.surface.page },
}));
