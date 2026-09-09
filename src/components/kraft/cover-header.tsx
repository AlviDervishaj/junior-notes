import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Layout, Type } from '@/theme';

import { Stamp } from './stamp';

export type CoverHeaderProps = {
  title: string;
  subtitle?: string;
  stamp?: string;
  right?: ReactNode;
};

/** The kraft "cover" that the dot-grid page sits beneath. */
export function CoverHeader({ title, subtitle, stamp, right }: CoverHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.cover, { paddingTop: insets.top + Layout.space.sm }]}>
      <View style={styles.topRow}>
        {stamp ? <Stamp label={stamp} /> : null}
        {right}
      </View>
      <Text style={[Type.coverTitle, styles.title]}>{title}</Text>
      {subtitle ? (
        <Text testID="cover-subtitle" style={[Type.metaLabel, styles.subtitle]}>
          {subtitle.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: Colors.surface.cover,
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.md,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: Colors.text.onKraft, marginTop: Layout.space.sm },
  subtitle: { color: Colors.text.onKraft, opacity: 0.78, marginTop: Layout.space.xs },
});
