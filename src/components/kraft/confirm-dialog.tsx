import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Type } from '@/theme';

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
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <Text style={[Type.cardTitle, styles.title]}>{title}</Text>
          {detail ? <Text style={[Type.excerpt, styles.detail]}>{detail}</Text> : null}

          <View style={styles.actions}>
            <Pressable testID="confirm-cancel" onPress={onCancel} style={styles.cancel}>
              <Text style={[Type.tabLabel, styles.cancelText]}>CANCEL</Text>
            </Pressable>
            <Pressable testID="confirm-accept" onPress={onConfirm} style={styles.accept}>
              <Text style={[Type.tabLabel, styles.acceptText]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(34, 48, 63, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.space.xl,
  },
  sheet: {
    width: '100%',
    backgroundColor: Colors.surface.card,
    borderRadius: Layout.radius.card,
    borderWidth: Layout.hairline,
    borderColor: Colors.border.card,
    padding: Layout.space.lg,
    gap: Layout.space.sm,
  },
  title: { color: Colors.text.primary },
  detail: { color: Colors.text.secondary },
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
    borderColor: Colors.border.hairline,
    borderRadius: Layout.radius.chip,
  },
  cancelText: { color: Colors.text.secondary },
  accept: {
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
    backgroundColor: Colors.accent,
    borderRadius: Layout.radius.chip,
  },
  acceptText: { color: Colors.text.onKraft },
});
