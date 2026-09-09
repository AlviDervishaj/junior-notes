import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Type } from '@/theme';

import { Stamp } from './stamp';

export type ErrorScreenProps = {
  title: string;
  detail: string;
  onRetry?: () => void;
};

/**
 * Blocking failure screen. Used when the database cannot be opened or
 * migrated — never silently continue on an unknown schema (spec §8).
 */
export function ErrorScreen({ title, detail, onRetry }: ErrorScreenProps) {
  return (
    <View style={styles.root}>
      <Stamp label="error" tone="onPaper" />
      <Text style={[Type.coverTitle, styles.title]}>{title}</Text>
      <Text style={[Type.excerpt, styles.detail]}>{detail}</Text>
      {onRetry ? (
        <Pressable testID="error-retry" onPress={onRetry} style={styles.retry}>
          <Text style={[Type.tabLabel, styles.retryText]}>TRY AGAIN</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface.page,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: Layout.space.xl,
    gap: Layout.space.md,
  },
  title: { color: Colors.text.primary },
  detail: { color: Colors.text.secondary },
  retry: {
    marginTop: Layout.space.md,
    backgroundColor: Colors.accent,
    borderRadius: Layout.radius.card,
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
  },
  retryText: { color: Colors.text.onKraft },
});
