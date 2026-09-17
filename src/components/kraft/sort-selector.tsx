import { Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import type { NoteSortOption } from '@/db/notes';
import { haptics } from '@/lib/haptics';
import { Layout, makeThemedStyles, Type, useScheme, Schemes } from '@/theme';

export type SortSelectorProps = {
  selected: NoteSortOption;
  onSelect: (sort: NoteSortOption) => void;
};

type SortOption = {
  id: NoteSortOption;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  accessibilityLabel: string;
};

const SORT_OPTIONS: SortOption[] = [
  { id: 'updated_desc', label: 'RECENT', icon: 'clock', accessibilityLabel: 'Sort by recently modified' },
  { id: 'created_desc', label: 'NEWEST', icon: 'calendar', accessibilityLabel: 'Sort by creation date newest first' },
  { id: 'title_asc', label: 'A-Z', icon: 'type', accessibilityLabel: 'Sort alphabetically A to Z' },
  { id: 'checklist', label: 'TASKS', icon: 'check-square', accessibilityLabel: 'Sort with uncompleted tasks first' },
];

export function SortSelector({ selected, onSelect }: SortSelectorProps) {
  const styles = useStyles();
  const scheme = useScheme();
  const colors = Schemes[scheme];

  return (
    <View testID="sort-selector" style={styles.container}>
      <Text style={[Type.stampLabel, styles.label]}>SORT:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {SORT_OPTIONS.map((opt) => {
          const isActive = selected === opt.id;
          return (
            <Pressable
              key={opt.id}
              testID={`sort-option-${opt.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={opt.accessibilityLabel}
              onPress={() => {
                haptics.selection();
                onSelect(opt.id);
              }}
              style={({ pressed }) => [
                styles.chip,
                isActive && styles.chipActive,
                pressed && styles.chipPressed,
              ]}>
              <Feather
                name={opt.icon}
                size={9}
                color={colors.text.onKraft}
                style={[styles.chipIcon, isActive && styles.chipIconActive]}
              />
              <Text
                style={[
                  Type.metaLabel,
                  styles.chipText,
                  isActive && styles.chipTextActive,
                ]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = makeThemedStyles((c) => ({
  container: {
    backgroundColor: c.surface.cover,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.xs + 2,
    gap: Layout.space.sm,
  },
  label: {
    color: c.text.onKraft,
    fontSize: 8,
    letterSpacing: 1.2,
    opacity: 0.8,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.space.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  chipActive: {
    borderColor: c.text.onKraft,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipIcon: {
    opacity: 0.75,
  },
  chipIconActive: {
    opacity: 1,
  },
  chipText: {
    color: c.text.onKraft,
    fontSize: 8,
    letterSpacing: 0.8,
    opacity: 0.75,
  },
  chipTextActive: {
    opacity: 1,
    fontWeight: '700',
  },
}));
