import { StyleSheet, View } from 'react-native';

import { categoryById, Layout, type NoteCategory } from '@/theme';

export type CategorySquareProps = {
  category: NoteCategory | null;
  size?: number;
};

/** Colour-coded category mark. Renders nothing for an uncategorised note. */
export function CategorySquare({ category, size = 10 }: CategorySquareProps) {
  const resolved = categoryById(category);
  if (resolved === null) return null;

  return (
    <View
      testID={`category-square-${resolved.id}`}
      style={[styles.square, { width: size, height: size, backgroundColor: resolved.color }]}
    />
  );
}

const styles = StyleSheet.create({
  square: { borderRadius: Layout.radius.chip },
});
