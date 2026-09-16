import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/kraft/confirm-dialog';
import { CoverHeader } from '@/components/kraft/cover-header';
import { EmptyState } from '@/components/kraft/empty-state';
import { Paper } from '@/components/kraft/paper';
import { TrashCard } from '@/components/kraft/trash-card';
import { emptyTrash, hardDelete, restore } from '@/db/notes';
import type { DeletedNote } from '@/db/types';
import { useTrashNotes } from '@/hooks/use-notes';
import { useNow } from '@/hooks/use-now';
import { haptics } from '@/lib/haptics';
import { Layout, makeThemedStyles, Type } from '@/theme';

export default function TrashScreen() {
  const styles = useStyles();
  const db = useSQLiteContext();
  const { notes, reload } = useTrashNotes();
  const now = useNow();

  const [confirmEmptyVisible, setConfirmEmptyVisible] = useState(false);
  const [noteToPurge, setNoteToPurge] = useState<DeletedNote | null>(null);

  const handleRestore = async (id: number) => {
    await restore(db, id);
    haptics.success();
    reload();
  };

  const handlePurgeRequest = (id: number) => {
    const found = notes.find((n) => n.id === id);
    if (found) {
      setNoteToPurge(found);
    }
  };

  const handleConfirmPurgeSingle = async () => {
    if (!noteToPurge) return;
    await hardDelete(db, noteToPurge.id);
    setNoteToPurge(null);
    haptics.heavy();
    reload();
  };

  const handleEmptyTrash = async () => {
    await emptyTrash(db);
    setConfirmEmptyVisible(false);
    haptics.heavy();
    reload();
  };

  const itemCount = notes.length === 1 ? '1 item' : `${notes.length} items`;
  const subtitle = `${itemCount} · auto-purges in 30 days`;

  return (
    <View style={styles.root}>
      <CoverHeader
        title="Trash"
        subtitle={subtitle}
        stamp="salvage"
        right={
          notes.length > 0 ? (
            <Pressable
              testID="empty-trash-button"
              accessibilityRole="button"
              accessibilityLabel="Empty all trash"
              onPress={() => {
                haptics.warning();
                setConfirmEmptyVisible(true);
              }}
              style={styles.emptyButton}>
              <Text style={[Type.tabLabel, styles.emptyButtonText]}>EMPTY ALL</Text>
            </Pressable>
          ) : undefined
        }
      />

      <Paper>
        <FlatList
          data={notes}
          keyExtractor={(note) => String(note.id)}
          renderItem={({ item }) => (
            <TrashCard
              note={item}
              now={now}
              onRestore={handleRestore}
              onPurge={handlePurgeRequest}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              stamp="clear desk"
              title="TRASH IS EMPTY"
              detail="Deleted notes are kept for 30 days before being permanently removed."
            />
          }
          contentContainerStyle={styles.list}
        />

        {/* Empty All Confirmation Dialog */}
        <ConfirmDialog
          visible={confirmEmptyVisible}
          title="EMPTY TRASH"
          detail="Permanently delete all notes in the trash? This action cannot be undone."
          confirmLabel="PURGE ALL"
          onConfirm={handleEmptyTrash}
          onCancel={() => setConfirmEmptyVisible(false)}
        />

        {/* Single Note Purge Confirmation Dialog */}
        <ConfirmDialog
          visible={noteToPurge !== null}
          title="PURGE NOTE"
          detail={`Permanently delete "${noteToPurge?.title.trim() || 'Untitled'}"? This action cannot be undone.`}
          confirmLabel="PURGE"
          onConfirm={handleConfirmPurgeSingle}
          onCancel={() => setNoteToPurge(null)}
        />
      </Paper>
    </View>
  );
}

const useStyles = makeThemedStyles((c) => ({
  root: { flex: 1 },
  list: { paddingBottom: Layout.space.xxl * 3 },
  emptyButton: {
    paddingHorizontal: Layout.space.sm,
    paddingVertical: 4,
    borderRadius: Layout.radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.accent,
    backgroundColor: 'transparent',
  },
  emptyButtonText: {
    color: c.accent,
    fontSize: 9,
    letterSpacing: 0.8,
  },
}));
