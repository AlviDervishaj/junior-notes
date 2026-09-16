import { Pressable, ScrollView, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { CATEGORIES, Layout, makeThemedStyles, Type, useScheme, type NoteCategory } from '@/theme';

export type CategoryFilterProps = {
  selected: NoteCategory | null;
  onSelect: (category: NoteCategory | null) => void;
};

const useStyles = makeThemedStyles((c) => ({
  container: {
    backgroundColor: c.surface.cover,
    paddingBottom: Layout.space.sm,
    paddingTop: Layout.space.xs,
  },
  scrollContent: {
    paddingHorizontal: Layout.space.lg,
    gap: Layout.space.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.space.md,
    paddingVertical: Layout.space.xs + 2,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    borderColor: 'rgba(251, 245, 233, 0.35)',
    backgroundColor: 'rgba(251, 245, 233, 0.12)',
    gap: 6,
  },
  pillActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    color: c.text.onKraft,
    fontSize: 8.5,
    letterSpacing: 0.8,
  },
  pillTextActive: {
    color: c.text.onKraft,
    fontWeight: '600',
  },
}));

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const styles = useStyles();
  const scheme = useScheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <Pressable
          testID="category-filter-all"
          accessibilityRole="button"
          accessibilityLabel="All notes"
          onPress={() => {
            haptics.selection();
            onSelect(null);
          }}
          style={[styles.pill, selected === null && styles.pillActive]}>
          <Text
            style={[
              Type.tabLabel,
              styles.pillText,
              selected === null && styles.pillTextActive,
            ]}>
            ALL
          </Text>
        </Pressable>

        {CATEGORIES.map((cat) => {
          const isActive = selected === cat.id;
          const catColor = cat.colors[scheme];
          return (
            <Pressable
              key={cat.id}
              testID={`category-filter-${cat.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${cat.label} notes`}
              onPress={() => {
                haptics.selection();
                onSelect(isActive ? null : cat.id);
              }}
              style={[
                styles.pill,
                isActive && {
                  backgroundColor: catColor,
                  borderColor: catColor,
                },
              ]}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: catColor },
                  isActive && { backgroundColor: '#FBF5E9' },
                ]}
              />
              <Text
                style={[
                  Type.tabLabel,
                  styles.pillText,
                  isActive && styles.pillTextActive,
                ]}>
                {cat.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
