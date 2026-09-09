import { StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Type } from '@/theme';

export type StampProps = {
  label: string;
  /** Degrees of rotation; the mockup uses a slight counter-clockwise tilt. */
  rotate?: number;
  tone?: 'onKraft' | 'onPaper';
};

/** Rubber-stamped label. Always renders uppercase. */
export function Stamp({ label, rotate = -1.4, tone = 'onKraft' }: StampProps) {
  const color = tone === 'onKraft' ? Colors.text.onKraft : Colors.accent;

  return (
    <View style={[styles.stamp, { borderColor: color, transform: [{ rotate: `${rotate}deg` }] }]}>
      <Text style={[Type.stampLabel, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: Layout.radius.stamp,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
});
