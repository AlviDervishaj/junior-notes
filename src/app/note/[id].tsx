import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/kraft/confirm-dialog';
import { Paper } from '@/components/kraft/paper';
import { SplitNoteDialog } from '@/components/kraft/split-note-dialog';
import {
  createNote,
  hardDelete,
  setCategory,
  setPinned,
  softDelete,
  splitNote,
  updateNote,
} from '@/db/notes';
import { useAutosave } from '@/hooks/use-autosave';
import { useNote } from '@/hooks/use-note';
import { useNow } from '@/hooks/use-now';
import { countWords, formatNoteDate } from '@/lib/format-date';
import { haptics } from '@/lib/haptics';
import { splitNoteContent, type SplitNoteResult } from '@/lib/split-note';
import { CATEGORIES, Layout, makeThemedStyles, Schemes, Type, useScheme, type NoteCategory } from '@/theme';

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
  const scheme = useScheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const isNew = rawId === 'new';
  const parsed = Number(rawId);
  const existingId = !isNew && Number.isFinite(parsed) ? parsed : null;

  const { note, loading } = useNote(existingId);
  const [confirming, setConfirming] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [splitPreview, setSplitPreview] = useState<SplitNoteResult | null>(null);
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

  // Provide sensory feedback when autosave completes successfully
  useEffect(() => {
    if (status === 'saved') {
      haptics.success();
    }
  }, [status]);

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

  const withSavedNote = useCallback(
    async (fn: (id: number) => Promise<void>) => {
      await flush();
      const currentId = noteIdRef.current;
      if (currentId !== null) await fn(currentId);
    },
    [flush]
  );

  const togglePin = useCallback(async () => {
    haptics.medium();
    const next = !pinned;
    setPinnedLocal(next);
    await withSavedNote((id) => setPinned(db, id, next, Date.now()));
  }, [db, pinned, withSavedNote]);

  const chooseCategory = useCallback(
    async (id: NoteCategory) => {
      haptics.selection();
      const next = category === id ? null : id;
      setCategoryLocal(next);
      await withSavedNote((noteId) => setCategory(db, noteId, next, Date.now()));
    },
    [category, db, withSavedNote]
  );

  const handleOpenSplit = useCallback(async () => {
    haptics.medium();
    await flush();
    const res = splitNoteContent(draft.title, draft.body);
    setSplitPreview(res);
    setSplitting(true);
  }, [draft.body, draft.title, flush]);

  const handleConfirmSplit = useCallback(async () => {
    if (!splitPreview) return;
    const currentId = noteIdRef.current;
    const now = Date.now();

    if (currentId === null) {
      // Note was not yet created in DB, create two new notes
      const firstId = await createNote(db, {
        title: splitPreview.first.title,
        body: splitPreview.first.body,
        category,
        now,
      });
      await createNote(db, {
        title: splitPreview.second.title,
        body: splitPreview.second.body,
        category,
        now: now + 1,
      });
      setSplitting(false);
      router.replace(`/note/${firstId}`);
    } else {
      // Split existing note transactionally
      await splitNote(
        db,
        currentId,
        {
          firstTitle: splitPreview.first.title,
          firstBody: splitPreview.first.body,
          secondTitle: splitPreview.second.title,
          secondBody: splitPreview.second.body,
          category,
        },
        now
      );
      setSplitting(false);
      router.replace(`/note/${currentId}`);
    }
  }, [category, db, router, splitPreview]);

  const remove = useCallback(async () => {
    haptics.heavy();
    setConfirming(false);
    const deletedId = noteIdRef.current;
    if (deletedId !== null) {
      await softDelete(db, deletedId, Date.now());
    }
    router.replace({ pathname: '/', params: deletedId ? { deleted: String(deletedId) } : {} });
  }, [db, router]);

  const leave = useCallback(async () => {
    haptics.light();
    await flush();
    const empty = draft.title.trim() === '' && draft.body.trim() === '';
    if (empty && noteIdRef.current !== null) {
      await hardDelete(db, noteIdRef.current);
    }
    router.back();
  }, [db, draft.body, draft.title, flush, router]);

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
              placeholderTextColor={Schemes[scheme].text.secondary}
              style={[Type.screenTitle, styles.title]}
            />
            <Text style={[Type.metaLabel, styles.meta]}>
              {`${formatNoteDate(timestamp, now)} · ${countWords(draft.body)} WORDS`}
            </Text>

            <View style={styles.actionRow}>
              <Pressable testID="action-pin" onPress={togglePin} hitSlop={8}>
                <Text style={[Type.tabLabel, styles.action]}>{pinned ? 'UNPIN' : 'PIN'}</Text>
              </Pressable>
              <Pressable testID="action-split" onPress={handleOpenSplit} hitSlop={8}>
                <Text style={[Type.tabLabel, styles.action]}>SPLIT</Text>
              </Pressable>
              {CATEGORIES.map((option) => (
                <Pressable
                  key={option.id}
                  testID={`action-category-${option.id}`}
                  accessibilityLabel={`Category ${option.label}`}
                  onPress={() => chooseCategory(option.id)}
                  hitSlop={8}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: option.colors[scheme] },
                      category === option.id && styles.categoryDotActive,
                    ]}
                  />
                </Pressable>
              ))}
              <Pressable
                testID="action-delete"
                onPress={() => {
                  haptics.warning();
                  setConfirming(true);
                }}
                hitSlop={8}>
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
                placeholderTextColor={Schemes[scheme].text.secondary}
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

      <SplitNoteDialog
        visible={splitting}
        first={splitPreview?.first ?? { title: '', body: '' }}
        second={splitPreview?.second ?? { title: '', body: '' }}
        onConfirm={handleConfirmSplit}
        onCancel={() => setSplitting(false)}
      />
    </View>
  );
}

const useStyles = makeThemedStyles((c) => ({
  root: { flex: 1 },
  fill: { flex: 1 },
  bar: {
    backgroundColor: c.surface.cover,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.md,
  },
  barText: { color: c.text.onKraft },
  page: {
    flexGrow: 1,
    padding: Layout.space.lg,
    paddingBottom: Layout.space.xxl * 2,
  },
  title: { color: c.text.primary, paddingVertical: Layout.space.xs },
  meta: { color: c.text.secondary, marginBottom: Layout.space.lg },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.space.md,
    marginBottom: Layout.space.lg,
  },
  action: { color: c.text.secondary },
  destructive: { color: c.accent, marginLeft: 'auto' },
  categoryDot: { width: 14, height: 14, borderRadius: Layout.radius.chip, opacity: 0.45 },
  categoryDotActive: { opacity: 1 },
  bodyWrap: { flex: 1, flexDirection: 'row', gap: Layout.space.md },
  marginRule: { width: 1, backgroundColor: c.marginRule, opacity: 0.55 },
  body: { color: c.text.primary, flex: 1 },
}));
