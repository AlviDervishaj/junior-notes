import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Type } from '@/theme';

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
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, timeoutMs]);

  if (!visible) return null;

  return (
    <View style={styles.bar}>
      <Text style={[Type.metaLabel, styles.message]}>{message}</Text>
      <Pressable testID="undo-action" onPress={onUndo} hitSlop={10}>
        <Text style={[Type.tabLabel, styles.action]}>UNDO</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Layout.space.md,
    right: Layout.space.md,
    bottom: Layout.space.lg,
    backgroundColor: Colors.text.primary,
    borderRadius: Layout.radius.card,
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: { color: Colors.text.onKraft },
  action: { color: Colors.surface.cover },
});
