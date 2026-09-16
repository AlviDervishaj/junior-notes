import { Modal, Pressable, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { Layout, makeThemedStyles, Type } from '@/theme';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  detail?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  detail,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const styles = useStyles();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <Text style={[Type.cardTitle, styles.title]}>{title}</Text>
          {detail ? <Text style={[Type.excerpt, styles.detail]}>{detail}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              testID="confirm-cancel"
              onPress={() => {
                haptics.light();
                onCancel();
              }}
              style={styles.cancel}>
              <Text style={[Type.tabLabel, styles.cancelText]}>CANCEL</Text>
            </Pressable>
            <Pressable
              testID="confirm-accept"
              onPress={() => {
                haptics.heavy();
                onConfirm();
              }}
              style={styles.accept}>
              <Text style={[Type.tabLabel, styles.acceptText]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeThemedStyles((c) => ({
  scrim: {
    flex: 1,
    backgroundColor: c.surface.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.space.xl,
  },
  sheet: {
    width: '100%',
    backgroundColor: c.surface.card,
    borderRadius: Layout.radius.card,
    borderWidth: Layout.hairline,
    borderColor: c.border.card,
    padding: Layout.space.lg,
    gap: Layout.space.sm,
  },
  title: { color: c.text.primary },
  detail: { color: c.text.secondary },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Layout.space.sm,
    marginTop: Layout.space.md,
  },
  cancel: {
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
    borderWidth: Layout.hairline,
    borderColor: c.border.hairline,
    borderRadius: Layout.radius.chip,
  },
  cancelText: { color: c.text.secondary },
  accept: {
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
    backgroundColor: c.accent,
    borderRadius: Layout.radius.chip,
  },
  acceptText: { color: c.text.onKraft },
}));
