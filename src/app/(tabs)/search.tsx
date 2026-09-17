import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { CategoryFilter } from '@/components/kraft/category-filter';
import { EmptyState } from '@/components/kraft/empty-state';
import { NoteCard } from '@/components/kraft/note-card';
import { Paper } from '@/components/kraft/paper';
import { useNotes } from '@/hooks/use-notes';
import { useNow } from '@/hooks/use-now';
import { Layout, makeThemedStyles, type NoteCategory, Schemes, Type, useScheme } from '@/theme';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const scheme = useScheme();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | null>(null);
  const { notes } = useNotes(query, selectedCategory);
  const now = useNow();

  const searching = query.trim() !== '';

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Layout.space.sm }]}>
        <View style={styles.inputContainer}>
          <Feather
            name="search"
            size={15}
            color={Schemes[scheme].text.secondary}
            style={styles.searchIcon}
          />
          <TextInput
            testID="search-input"
            value={query}
            onChangeText={setQuery}
            placeholder="find in all entries…"
            placeholderTextColor={Schemes[scheme].text.secondary}
            autoCorrect={false}
            autoCapitalize="none"
            style={[Type.metaLabel, styles.input]}
          />
          {searching && (
            <Pressable
              testID="search-clear-btn"
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
              onPress={() => setQuery('')}
              hitSlop={8}
              style={styles.clearButton}>
              <Feather name="x" size={14} color={Schemes[scheme].text.secondary} />
            </Pressable>
          )}
        </View>
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

const useStyles = makeThemedStyles((c) => ({
  root: { flex: 1 },
  bar: {
    backgroundColor: c.surface.cover,
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface.card,
    borderWidth: Layout.hairline,
    borderColor: c.border.card,
    borderRadius: Layout.radius.card,
    paddingHorizontal: Layout.space.md,
  },
  searchIcon: {
    marginRight: Layout.space.xs,
    opacity: 0.8,
  },
  input: {
    flex: 1,
    color: c.text.primary,
    paddingVertical: Layout.space.md,
    fontSize: 13,
  },
  clearButton: {
    padding: Layout.space.xs,
  },
  list: { paddingBottom: Layout.space.xxl * 2 },
}));
