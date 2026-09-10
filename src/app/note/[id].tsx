import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/kraft/confirm-dialog';
import { Paper } from '@/components/kraft/paper';
import {
  createNote,
  hardDelete,
  setCategory,
  setPinned,
  softDelete,
  updateNote,
} from '@/db/notes';
import { useAutosave } from '@/hooks/use-autosave';
import { useNote } from '@/hooks/use-note';
import { useNow } from '@/hooks/use-now';
import { countWords, formatNoteDate } from '@/lib/format-date';
import { CATEGORIES, Colors, Layout, Type, type NoteCategory } from '@/theme';

type Draft = { title: string; body: string };

const STATUS_TEXT = {
  idle: '',
  saving: 'SAVING…',
  saved: 'SAVED ✓',
  unsaved: 'UNSAVED',
} as const;

export default function EditorScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const isNew = rawId === 'new';
  const parsed = Number(rawId);
  const existingId = !isNew && Number.isFinite(parsed) ? parsed : null;

  const { note, loading } = useNote(existingId);
  const [confirming, setConfirming] = useState(false);
  const [pinned, setPinnedLocal] = useState(false);
  const [category, setCategoryLocal] = useState<NoteCategory | null>(null);
  const [draft, setDraft] = useState<Draft>({ title: '', body: '' });
  const noteIdRef = useRef<number | null>(existingId);
  const hydrated = useRef(false);

  useEffect(() => {
    if (note && !hydrated.current) {
      setDraft({ title: note.title, body: note.body });
      setPinnedLocal(note.pinned);
      setCategoryLocal(note.category);
      hydrated.current = true;
    }
  }, [note]);

  // A missing note redirects rather than rendering an empty editor (spec §8).
  useEffect(() => {
    if (!isNew && !loading && note === null) router.replace('/');
  }, [isNew, loading, note, router]);

  const persist = useCallback(
    async (value: Draft) => {
      const now = Date.now();
      if (noteIdRef.current === null) {
        // Created on first keystroke, not on open, so backing straight out
        // leaves no empty row behind.
        noteIdRef.current = await createNote(db, { ...value, now });
      } else {
        await updateNote(db, noteIdRef.current, value, now);
      }
    },
    [db]
  );

  const { status, change, flush } = useAutosave<Draft>(persist);

  const edit = useCallback(
    (patch: Partial<Draft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        change(next);
        return next;
      });
    },
    [change]
  );

  /** Actions need a saved row, so flush any pending draft write first. */
  const withSavedNote = useCallback(
    async (action: (id: number) => Promise<void>) => {
      await flush();
      if (noteIdRef.current !== null) await action(noteIdRef.current);
    },
    [flush]
  );

  const togglePin = useCallback(async () => {
    const next = !pinned;
    setPinnedLocal(next);
    await withSavedNote((id) => setPinned(db, id, next, Date.now()));
  }, [db, pinned, withSavedNote]);

  const chooseCategory = useCallback(
    async (id: NoteCategory) => {
      const next = category === id ? null : id;
      setCategoryLocal(next);
      await withSavedNote((noteId) => setCategory(db, noteId, next, Date.now()));
    },
    [category, db, withSavedNote]
  );

  const remove = useCallback(async () => {
    setConfirming(false);
    const deletedId = noteIdRef.current;
    if (deletedId !== null) {
      await softDelete(db, deletedId, Date.now());
      router.replace({ pathname: '/', params: { deleted: String(deletedId) } });
      return;
    }
    router.replace('/');
  }, [db, router]);

  const leave = useCallback(async () => {
    await flush();
    const empty = draft.title.trim() === '' && draft.body.trim() === '';
    if (empty && noteIdRef.current !== null) {
      await hardDelete(db, noteIdRef.current);
    }
    router.back();
  }, [db, draft, flush, router]);

  const now = useNow();
  const timestamp = note?.updatedAt ?? now;

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Layout.space.sm }]}>
        <Pressable testID="editor-back" onPress={leave} hitSlop={12}>
          <Text style={[Type.tabLabel, styles.barText]}>‹ NOTEBOOK</Text>
        </Pressable>
        <Text testID="save-status" style={[Type.tabLabel, styles.barText]}>
          {STATUS_TEXT[status]}
        </Text>
      </View>

      <Paper>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <TextInput
              testID="title-input"
              value={draft.title}
              onChangeText={(title) => edit({ title })}
              placeholder="Title"
              placeholderTextColor={Colors.text.secondary}
              style={[Type.screenTitle, styles.title]}
            />
            <Text style={[Type.metaLabel, styles.meta]}>
              {`${formatNoteDate(timestamp, now)} · ${countWords(draft.body)} WORDS`}
            </Text>

            <View style={styles.actionRow}>
              <Pressable testID="action-pin" onPress={togglePin} hitSlop={8}>
                <Text style={[Type.tabLabel, styles.action]}>{pinned ? 'UNPIN' : 'PIN'}</Text>
              </Pressable>
              {CATEGORIES.map((option) => (
                <Pressable
                  key={option.id}
                  testID={`action-category-${option.id}`}
                  onPress={() => chooseCategory(option.id)}
                  hitSlop={8}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: option.color },
                      category === option.id && styles.categoryDotActive,
                    ]}
                  />
                </Pressable>
              ))}
              <Pressable testID="action-delete" onPress={() => setConfirming(true)} hitSlop={8}>
                <Text style={[Type.tabLabel, styles.destructive]}>DELETE</Text>
              </Pressable>
            </View>

            <View style={styles.bodyWrap}>
              <View style={styles.marginRule} />
              <TextInput
                testID="body-input"
                value={draft.body}
                onChangeText={(body) => edit({ body })}
                placeholder="Start writing…"
                placeholderTextColor={Colors.text.secondary}
                multiline
                textAlignVertical="top"
                style={[Type.bodyText, styles.body]}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Paper>

      <ConfirmDialog
        visible={confirming}
        title="Delete this note?"
        detail="You can undo this from the notebook."
        confirmLabel="DELETE"
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  bar: {
    backgroundColor: Colors.surface.cover,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.md,
  },
  barText: { color: Colors.text.onKraft },
  page: { padding: Layout.space.lg, paddingBottom: Layout.space.xxl * 2 },
  title: { color: Colors.text.primary, paddingVertical: Layout.space.xs },
  meta: { color: Colors.text.secondary, marginBottom: Layout.space.lg },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.space.md,
    marginBottom: Layout.space.lg,
  },
  action: { color: Colors.text.secondary },
  destructive: { color: Colors.accent, marginLeft: 'auto' },
  categoryDot: { width: 14, height: 14, borderRadius: Layout.radius.chip, opacity: 0.45 },
  categoryDotActive: { opacity: 1 },
  bodyWrap: { flexDirection: 'row', gap: Layout.space.md },
  marginRule: { width: 1, backgroundColor: Colors.marginRule, opacity: 0.55 },
  body: { color: Colors.text.primary, flex: 1, minHeight: 320 },
});
