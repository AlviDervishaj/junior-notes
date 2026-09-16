import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { Layout, makeThemedStyles, Type } from '@/theme';

export type UndoBarProps = {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  timeoutMs?: number;
};

export function UndoBar({
  visible,
  message,
  onUndo,
  onDismiss,
  timeoutMs = 5000,
}: UndoBarProps) {
  const styles = useStyles();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, timeoutMs]);

  if (!visible) return null;

  return (
    <View style={styles.bar}>
      <Text style={[Type.metaLabel, styles.message]}>{message}</Text>
      <Pressable
        testID="undo-action"
        onPress={() => {
          haptics.success();
          onUndo();
        }}
        hitSlop={10}>
        <Text style={[Type.tabLabel, styles.action]}>UNDO</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeThemedStyles((c) => ({
  bar: {
    position: 'absolute',
    left: Layout.space.md,
    right: Layout.space.md,
    bottom: Layout.space.lg,
    backgroundColor: c.text.primary,
    borderRadius: Layout.radius.card,
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: { color: c.text.onKraft },
  action: { color: c.surface.cover },
}));
