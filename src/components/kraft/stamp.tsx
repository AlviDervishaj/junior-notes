import { StyleSheet, Text, View } from 'react-native';

import { Layout, makeThemedStyles, Type } from '@/theme';

export type StampProps = {
  label: string;
  /** Degrees of rotation; the mockup uses a slight counter-clockwise tilt. */
  rotate?: number;
  tone?: 'onKraft' | 'onPaper';
};

/** Rubber-stamped label. Always renders uppercase. */
export function Stamp({ label, rotate = -1.4, tone = 'onKraft' }: StampProps) {
  const themed = useThemedColors();
  const color = tone === 'onKraft' ? themed.onKraft.color : themed.onPaper.color;

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

/** Only the colour varies; the box geometry is scheme-independent. */
const useThemedColors = makeThemedStyles((c) => ({
  onKraft: { color: c.text.onKraft },
  onPaper: { color: c.accent },
}));
