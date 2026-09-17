import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import type { Note } from '@/db/types';
import { getChecklistSummary } from '@/lib/checklist';
import { formatNoteDate } from '@/lib/format-date';
import { haptics } from '@/lib/haptics';
import { splitOnMatch } from '@/lib/highlight';
import { categoryById, Layout, makeThemedStyles, Type, useScheme, Schemes } from '@/theme';

import { CategorySquare } from './category-square';

export type NoteCardProps = {
  note: Note;
  now: number;
  onPress: (id: number) => void;
  /** When set, occurrences of this query are marked in the title. */
  highlight?: string;
};

export function NoteCard({ note, now, onPress, highlight }: NoteCardProps) {
  const styles = useStyles();
  const scheme = useScheme();
  const colors = Schemes[scheme];
  const category = categoryById(note.category);
  const categoryColor = category ? category.colors[scheme] : null;
  const checklist = getChecklistSummary(note.body);

  return (
    <Pressable
      testID={`note-card-${note.id}`}
      onPress={() => {
        haptics.light();
        onPress(note.id);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.titleRow}>
        <CategorySquare category={note.category} />
        <Text style={[Type.cardTitle, styles.title]} numberOfLines={1}>
          {note.title.trim() === ''
            ? 'Untitled'
            : highlight
              ? splitOnMatch(note.title, highlight).map((segment, i) => (
                  <Text key={i} style={segment.match ? styles.match : undefined}>
                    {segment.text}
                  </Text>
                ))
              : note.title}
        </Text>
      </View>

      {note.body.trim() === '' ? null : (
        <Text style={[Type.excerpt, styles.excerpt]} numberOfLines={2}>
          {note.body}
        </Text>
      )}

      <View style={styles.metaRow}>
        <View style={styles.leftMeta}>
          <Text style={[Type.metaLabel, styles.date]}>{formatNoteDate(note.updatedAt, now)}</Text>
          {category && categoryColor ? (
            <View
              testID={`note-category-badge-${note.id}`}
              style={[styles.categoryBadge, { borderColor: categoryColor }]}>
              <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                {category.label.toUpperCase()}
              </Text>
            </View>
          ) : null}
          {checklist.total > 0 ? (
            <View
              testID={`note-checklist-badge-${note.id}`}
              style={styles.checklistBadge}>
              <Feather name="check-square" size={8} color={colors.text.secondary} />
              <Text style={styles.checklistBadgeText}>
                {`${checklist.completed}/${checklist.total}`}
              </Text>
            </View>
          ) : null}
        </View>

        {note.pinned ? (
          <View style={styles.pin}>
            <Feather name="bookmark" size={7} color={colors.text.onKraft} />
            <Text style={[Type.stampLabel, styles.pinText]}>PINNED</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
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
  pressed: { opacity: 0.72 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.space.sm },
  title: { color: c.text.primary, flexShrink: 1 },
  excerpt: { color: c.text.secondary, marginTop: Layout.space.xs },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Layout.space.sm,
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.space.sm,
  },
  date: { color: c.text.secondary },
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
  checklistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    borderColor: c.border.hairline,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  checklistBadgeText: {
    fontSize: 7.5,
    letterSpacing: 0.8,
    fontFamily: Type.metaLabel.fontFamily,
    color: c.text.secondary,
  },
  match: { backgroundColor: c.highlight },
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.accent,
    borderRadius: Layout.radius.chip,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pinText: { color: c.text.onKraft, fontSize: 7, letterSpacing: 1.3 },
}));
