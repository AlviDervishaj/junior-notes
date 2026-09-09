import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, FontFamily, Layout } from '@/theme';

export type FabProps = {
  onPress: () => void;
  accessibilityLabel: string;
};

export function Fab({ onPress, accessibilityLabel }: FabProps) {
  return (
    <Pressable
      testID="fab"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
      <Text style={styles.plus}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Layout.space.lg,
    bottom: Layout.space.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  plus: {
    color: Colors.text.onKraft,
    fontFamily: FontFamily.chrome,
    fontSize: 26,
    lineHeight: 30,
  },
});
