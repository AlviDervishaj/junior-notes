import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { CoverHeader } from '@/components/kraft/cover-header';
import { EmptyState } from '@/components/kraft/empty-state';
import { Fab } from '@/components/kraft/fab';
import { NoteCard } from '@/components/kraft/note-card';
import { Paper } from '@/components/kraft/paper';
import { useNotes } from '@/hooks/use-notes';
import { Layout } from '@/theme';

export default function NotesScreen() {
  const router = useRouter();
  const { notes } = useNotes();
  const now = Date.now();

  const entryCount = notes.length === 1 ? '1 entry' : `${notes.length} entries`;

  return (
    <View style={styles.root}>
      <CoverHeader
        title="Notebook"
        subtitle={`${entryCount} · all saved`}
        stamp={`no. ${String(notes.length).padStart(3, '0')} · field`}
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
              title="NO ENTRIES YET"
              detail="Tap the button below to write your first note."
            />
          }
          contentContainerStyle={styles.list}
        />
        <Fab accessibilityLabel="New note" onPress={() => router.push('/note/new')} />
      </Paper>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingBottom: Layout.space.xxl * 3 },
});
