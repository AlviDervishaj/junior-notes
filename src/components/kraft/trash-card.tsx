import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import type { DeletedNote } from '@/db/types';
import { formatDaysRemaining } from '@/lib/format-date';
import { haptics } from '@/lib/haptics';
import { categoryById, Layout, makeThemedStyles, Type, useScheme, Schemes } from '@/theme';

import { CategorySquare } from './category-square';

export type TrashCardProps = {
  note: DeletedNote;
  now: number;
  onRestore: (id: number) => void;
  onPurge: (id: number) => void;
};

export function TrashCard({ note, now, onRestore, onPurge }: TrashCardProps) {
  const styles = useStyles();
  const scheme = useScheme();
  const colors = Schemes[scheme];
  const category = categoryById(note.category);
  const categoryColor = category ? category.colors[scheme] : null;

  return (
    <View testID={`trash-card-${note.id}`} style={styles.card}>
      <View style={styles.titleRow}>
        <CategorySquare category={note.category} />
        <Text style={[Type.cardTitle, styles.title]} numberOfLines={1}>
          {note.title.trim() === '' ? 'Untitled' : note.title}
        </Text>
      </View>

      {note.body.trim() === '' ? null : (
        <Text style={[Type.excerpt, styles.excerpt]} numberOfLines={2}>
          {note.body}
        </Text>
      )}

      <View style={styles.footerRow}>
        <View style={styles.leftMeta}>
          <Text style={[Type.metaLabel, styles.remainingDays]}>
            {formatDaysRemaining(note.deletedAt, now)}
          </Text>
          {category && categoryColor ? (
            <View
              testID={`trash-category-badge-${note.id}`}
              style={[styles.categoryBadge, { borderColor: categoryColor }]}>
              <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                {category.label.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            testID={`trash-restore-${note.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Restore note ${note.title || 'Untitled'}`}
            onPress={() => {
              haptics.success();
              onRestore(note.id);
            }}
            style={styles.restoreButton}>
            <Feather name="rotate-ccw" size={10} color={colors.accent} />
            <Text style={[Type.tabLabel, styles.restoreText]}>RESTORE</Text>
          </Pressable>

          <Pressable
            testID={`trash-purge-${note.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Permanently delete note ${note.title || 'Untitled'}`}
            onPress={() => {
              haptics.warning();
              onPurge(note.id);
            }}
            style={styles.purgeButton}>
            <Feather name="trash-2" size={10} color={colors.text.secondary} />
            <Text style={[Type.tabLabel, styles.purgeText]}>PURGE</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((c) => ({
  card: {
    backgroundColor: c.surface.card,
    borderRadius: Layout.radius.card,
    borderWidth: Layout.hairline,
    borderColor: c.border.card,
    marginHorizontal: Layout.space.md,
    marginTop: Layout.space.sm,
    paddingHorizontal: Layout.space.md,
    paddingVertical: Layout.space.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.space.sm },
  title: { color: c.text.primary, flexShrink: 1 },
  excerpt: { color: c.text.secondary, marginTop: Layout.space.xs },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Layout.space.md,
    paddingTop: Layout.space.xs,
    borderTopWidth: Layout.hairline,
    borderTopColor: c.border.hairline,
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.space.sm,
  },
  remainingDays: {
    color: c.accent,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  categoryBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  categoryBadgeText: {
    fontSize: 7.5,
    letterSpacing: 0.8,
    fontFamily: Type.metaLabel.fontFamily,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.space.xs,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Layout.space.sm,
    paddingVertical: 4,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    borderColor: c.accent,
    backgroundColor: 'transparent',
  },
  restoreText: {
    color: c.accent,
    fontSize: 8.5,
    letterSpacing: 0.8,
  },
  purgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Layout.space.sm,
    paddingVertical: 4,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    borderColor: c.border.hairline,
    backgroundColor: 'transparent',
  },
  purgeText: {
    color: c.text.secondary,
    fontSize: 8.5,
    letterSpacing: 0.8,
  },
}));
