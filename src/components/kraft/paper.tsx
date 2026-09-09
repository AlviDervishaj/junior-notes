import { ImageBackground, StyleSheet, type ViewProps } from 'react-native';

import { Colors } from '@/theme';

/**
 * Dot-grid paper. The grid is a repeating tile because React Native has no
 * radial-gradient and a View per dot would be thousands of nodes.
 */
export function Paper({ style, children, ...rest }: ViewProps) {
  return (
    <ImageBackground
      source={require('@/assets/images/dot-grid.png')}
      resizeMode="repeat"
      style={[styles.paper, style]}
      {...rest}>
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  paper: { flex: 1, backgroundColor: Colors.surface.page },
});
