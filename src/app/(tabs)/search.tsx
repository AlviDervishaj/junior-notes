import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryFilter } from '@/components/kraft/category-filter';
import { EmptyState } from '@/components/kraft/empty-state';
import { NoteCard } from '@/components/kraft/note-card';
import { Paper } from '@/components/kraft/paper';
import { useNotes } from '@/hooks/use-notes';
import { useNow } from '@/hooks/use-now';
import { Colors, Layout, type NoteCategory, Type } from '@/theme';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | null>(null);
  const { notes } = useNotes(query, selectedCategory);
  const now = useNow();

  const searching = query.trim() !== '';

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Layout.space.sm }]}>
        <TextInput
          testID="search-input"
          value={query}
          onChangeText={setQuery}
          placeholder="find in all entries…"
          placeholderTextColor={Colors.text.secondary}
          autoCorrect={false}
          autoCapitalize="none"
          style={[Type.metaLabel, styles.input]}
        />
      </View>
      <CategoryFilter
        selected={selectedCategory}
        onSelect={(cat) => setSelectedCategory(cat)}
      />

      <Paper>
        <FlatList
          data={notes}
          keyExtractor={(note) => String(note.id)}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              now={now}
              highlight={query}
              onPress={(id) => router.push(`/note/${id}`)}
            />
          )}
          ListEmptyComponent={
            searching ? (
              <EmptyState stamp="not found" title="NOTHING FILED UNDER…" detail={query} />
            ) : (
              <EmptyState
                stamp="find"
                title="SEARCH YOUR NOTEBOOK"
                detail="Type to look through every entry."
              />
            )
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      </Paper>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    backgroundColor: Colors.surface.cover,
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.md,
  },
  input: {
    backgroundColor: Colors.surface.card,
    borderWidth: Layout.hairline,
    borderColor: Colors.border.card,
    borderRadius: Layout.radius.card,
    color: Colors.text.primary,
    paddingHorizontal: Layout.space.md,
    paddingVertical: Layout.space.md,
    fontSize: 13,
  },
  list: { paddingBottom: Layout.space.xxl * 2 },
});
