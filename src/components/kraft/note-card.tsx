import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Note } from '@/db/types';
import { formatNoteDate } from '@/lib/format-date';
import { splitOnMatch } from '@/lib/highlight';
import { categoryById, Colors, Layout, Type } from '@/theme';

import { CategorySquare } from './category-square';

export type NoteCardProps = {
  note: Note;
  now: number;
  onPress: (id: number) => void;
  /** When set, occurrences of this query are marked in the title. */
  highlight?: string;
};

export function NoteCard({ note, now, onPress, highlight }: NoteCardProps) {
  const category = categoryById(note.category);

  return (
    <Pressable
      testID={`note-card-${note.id}`}
      onPress={() => onPress(note.id)}
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
          {category ? (
            <View
              testID={`note-category-badge-${note.id}`}
              style={[styles.categoryBadge, { borderColor: category.color }]}>
              <Text style={[styles.categoryBadgeText, { color: category.color }]}>
                {category.label.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>

        {note.pinned ? (
          <View style={styles.pin}>
            <Text style={[Type.stampLabel, styles.pinText]}>PINNED</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface.card,
    borderRadius: Layout.radius.card,
    borderWidth: Layout.hairline,
    borderColor: Colors.border.card,
    marginHorizontal: Layout.space.md,
    marginTop: Layout.space.sm,
    paddingHorizontal: Layout.space.md,
    paddingVertical: Layout.space.md,
  },
  pressed: { opacity: 0.72 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.space.sm },
  title: { color: Colors.text.primary, flexShrink: 1 },
  excerpt: { color: Colors.text.secondary, marginTop: Layout.space.xs },
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
  date: { color: Colors.text.secondary },
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
  match: { backgroundColor: Colors.highlight },
  pin: {
    backgroundColor: Colors.accent,
    borderRadius: Layout.radius.chip,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pinText: { color: Colors.text.onKraft, fontSize: 7, letterSpacing: 1.3 },
});
