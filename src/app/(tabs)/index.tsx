import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { CategoryFilter } from '@/components/kraft/category-filter';
import { CoverHeader } from '@/components/kraft/cover-header';
import { EmptyState } from '@/components/kraft/empty-state';
import { Fab } from '@/components/kraft/fab';
import { NoteCard } from '@/components/kraft/note-card';
import { Paper } from '@/components/kraft/paper';
import { UndoBar } from '@/components/kraft/undo-bar';
import { restore } from '@/db/notes';
import { useNotes } from '@/hooks/use-notes';
import { useNow } from '@/hooks/use-now';
import { categoryById, Layout, type NoteCategory } from '@/theme';

export default function NotesScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | null>(null);
  const { notes, reload } = useNotes(undefined, selectedCategory);
  const now = useNow();

  // The editor hands the deleted id back as a route param so the undo
  // affordance lives on the list, where the note reappears. Visibility is
  // derived from the param and a dismissed marker, rather than synced into
  // state by an effect.
  const { deleted } = useLocalSearchParams<{ deleted?: string }>();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const undoId = Number(deleted);
  const canUndo =
    deleted !== undefined && deleted !== dismissed && Number.isFinite(undoId);

  const entryCount = notes.length === 1 ? '1 entry' : `${notes.length} entries`;
  const activeLabel =
    selectedCategory !== null ? categoryById(selectedCategory)?.label : null;
  const subtitle =
    activeLabel != null
      ? `${entryCount} · in ${activeLabel.toLowerCase()}`
      : `${entryCount} · all saved`;

  return (
    <View style={styles.root}>
      <CoverHeader
        title="Notebook"
        subtitle={subtitle}
        stamp={`no. ${String(notes.length).padStart(3, '0')} · field`}
      />
      <CategoryFilter
        selected={selectedCategory}
        onSelect={(cat) => setSelectedCategory(cat)}
      />
      <Paper>
        <FlatList
          data={notes}
          keyExtractor={(note) => String(note.id)}
          renderItem={({ item }) => (
            <NoteCard note={item} now={now} onPress={(id) => router.push(`/note/${id}`)} />
          )}
          ListEmptyComponent={
            <EmptyState
              stamp="blank page"
              title={selectedCategory ? `NO ${activeLabel?.toUpperCase()} NOTES` : 'NO ENTRIES YET'}
              detail={
                selectedCategory
                  ? `No notes found under the ${activeLabel?.toLowerCase()} label.`
                  : 'Tap the button below to write your first note.'
              }
            />
          }
          contentContainerStyle={styles.list}
        />
        <Fab accessibilityLabel="New note" onPress={() => router.push('/note/new')} />

        <UndoBar
          visible={canUndo}
          message="Note deleted"
          onUndo={async () => {
            await restore(db, undoId);
            setDismissed(deleted ?? null);
            reload();
          }}
          onDismiss={() => setDismissed(deleted ?? null)}
        />
      </Paper>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingBottom: Layout.space.xxl * 3 },
});
