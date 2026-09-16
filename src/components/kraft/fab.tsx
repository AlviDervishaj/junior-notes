import { Pressable, Text } from 'react-native';

import { haptics } from '@/lib/haptics';
import { FontFamily, Layout, makeThemedStyles } from '@/theme';

export type FabProps = {
  onPress: () => void;
  accessibilityLabel: string;
};

export function Fab({ onPress, accessibilityLabel }: FabProps) {
  const styles = useStyles();

  return (
    <Pressable
      testID="fab"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
      <Text style={styles.plus}>+</Text>
    </Pressable>
  );
}

const useStyles = makeThemedStyles((c) => ({
  fab: {
    position: 'absolute',
    right: Layout.space.lg,
    bottom: Layout.space.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  plus: {
    color: c.text.onKraft,
    fontFamily: FontFamily.chrome,
    fontSize: 26,
    lineHeight: 30,
  },
}));
