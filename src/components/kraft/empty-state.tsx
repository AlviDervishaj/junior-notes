import { Text, View } from 'react-native';

import { Layout, makeThemedStyles, Type } from '@/theme';

import { Stamp } from './stamp';

export type EmptyStateProps = {
  stamp: string;
  title: string;
  detail?: string;
};

/** Stamped empty state, in the aesthetic rather than a generic illustration. */
export function EmptyState({ stamp, title, detail }: EmptyStateProps) {
  const styles = useStyles();

  return (
    <View style={styles.root}>
      {/* Stamp hugs its content via alignSelf: 'flex-start', so it needs a
          content-sized wrapper to sit centred with the rest of the block. */}
      <View>
        <Stamp label={stamp} tone="onPaper" rotate={-2.5} />
      </View>
      <Text style={[Type.cardTitle, styles.title]}>{title}</Text>
      {detail ? <Text style={[Type.excerpt, styles.detail]}>{detail}</Text> : null}
    </View>
  );
}

const useStyles = makeThemedStyles((c) => ({
  root: { alignItems: 'center', paddingTop: Layout.space.xxl * 2, gap: Layout.space.md },
  title: { color: c.text.primary },
  detail: { color: c.text.secondary, textAlign: 'center', paddingHorizontal: Layout.space.xl },
}));
