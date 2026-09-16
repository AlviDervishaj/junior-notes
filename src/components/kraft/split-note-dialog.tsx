import { Modal, Pressable, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { Layout, makeThemedStyles, Type } from '@/theme';

export type SplitNoteDialogProps = {
  visible: boolean;
  first: {
    title: string;
    body: string;
  };
  second: {
    title: string;
    body: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
};

export function SplitNoteDialog({
  visible,
  first,
  second,
  onConfirm,
  onCancel,
}: SplitNoteDialogProps) {
  const styles = useStyles();

  if (!visible) return null;

  const firstExcerpt =
    first.body.length > 80 ? `${first.body.slice(0, 80)}…` : first.body || '(empty)';
  const secondExcerpt =
    second.body.length > 80 ? `${second.body.slice(0, 80)}…` : second.body || '(empty)';

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[Type.stampLabel, styles.title]}>SPLIT NOTE</Text>
          <Text style={[Type.excerpt, styles.description]}>
            Divide this note into two separate entries:
          </Text>

          <View style={styles.previewContainer}>
            <View testID="split-preview-part1" style={styles.previewBox}>
              <Text style={[Type.stampLabel, styles.partLabel]}>PART 1</Text>
              <Text style={[Type.cardTitle, styles.previewTitle]} numberOfLines={1}>
                {first.title}
              </Text>
              <Text style={[Type.excerpt, styles.previewBody]} numberOfLines={2}>
                {firstExcerpt}
              </Text>
            </View>

            <View testID="split-preview-part2" style={styles.previewBox}>
              <Text style={[Type.stampLabel, styles.partLabel]}>PART 2</Text>
              <Text style={[Type.cardTitle, styles.previewTitle]} numberOfLines={1}>
                {second.title}
              </Text>
              <Text style={[Type.excerpt, styles.previewBody]} numberOfLines={2}>
                {secondExcerpt}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              testID="split-confirm-cancel"
              accessibilityRole="button"
              accessibilityLabel="Cancel split"
              onPress={() => {
                haptics.light();
                onCancel();
              }}
              style={[styles.button, styles.cancelButton]}>
              <Text style={[Type.tabLabel, styles.cancelText]}>CANCEL</Text>
            </Pressable>
            <Pressable
              testID="split-confirm-accept"
              accessibilityRole="button"
              accessibilityLabel="Confirm split"
              onPress={() => {
                haptics.success();
                onConfirm();
              }}
              style={[styles.button, styles.confirmButton]}>
              <Text style={[Type.tabLabel, styles.confirmText]}>SPLIT NOTE</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeThemedStyles((c) => ({
  backdrop: {
    flex: 1,
    backgroundColor: c.surface.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: c.surface.card,
    borderRadius: Layout.radius.card,
    borderWidth: Layout.hairline,
    borderColor: c.border.card,
    padding: Layout.space.lg,
    gap: Layout.space.md,
  },
  title: {
    color: c.text.primary,
    fontSize: 13,
    letterSpacing: 1.2,
  },
  description: {
    color: c.text.secondary,
    fontSize: 13,
  },
  previewContainer: {
    gap: Layout.space.sm,
  },
  previewBox: {
    backgroundColor: c.surface.page,
    padding: Layout.space.md,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    borderColor: c.border.hairline,
    gap: 4,
  },
  partLabel: {
    fontSize: 8.5,
    color: c.accent,
    letterSpacing: 1,
  },
  previewTitle: {
    fontSize: 14,
    color: c.text.primary,
  },
  previewBody: {
    fontSize: 12,
    color: c.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Layout.space.sm,
    marginTop: Layout.space.xs,
  },
  button: {
    paddingHorizontal: Layout.space.md,
    paddingVertical: Layout.space.sm,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderColor: c.border.hairline,
    backgroundColor: 'transparent',
  },
  confirmButton: {
    borderColor: c.accent,
    backgroundColor: c.accent,
  },
  cancelText: {
    color: c.text.secondary,
  },
  confirmText: {
    color: c.text.onKraft,
    fontWeight: '600',
  },
}));
