import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { formatNote, type ExportFormat } from '@/lib/export-note';
import { haptics } from '@/lib/haptics';
import { Layout, makeThemedStyles, Type } from '@/theme';

export type ExportNoteDialogProps = {
  visible: boolean;
  title: string;
  body: string;
  categoryLabel?: string | null;
  onShare: (format: ExportFormat) => void;
  onCancel: () => void;
};

export function ExportNoteDialog({
  visible,
  title,
  body,
  categoryLabel,
  onShare,
  onCancel,
}: ExportNoteDialogProps) {
  const styles = useStyles();
  const [format, setFormat] = useState<ExportFormat>('markdown');

  if (!visible) return null;

  const formattedContent = formatNote(title, body, format, { categoryLabel });
  const previewExcerpt =
    formattedContent.length > 220
      ? `${formattedContent.slice(0, 220)}…`
      : formattedContent || '(empty note)';

  const handleSelectFormat = (selected: ExportFormat) => {
    haptics.selection();
    setFormat(selected);
  };

  const handleShare = () => {
    haptics.success();
    onShare(format);
  };

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[Type.stampLabel, styles.title]}>EXPORT & SHARE</Text>
          <Text style={[Type.excerpt, styles.description]}>
            Choose export format to share via iOS Share Sheet:
          </Text>

          {/* Format Selector */}
          <View style={styles.formatRow}>
            <Pressable
              testID="format-markdown"
              accessibilityRole="button"
              accessibilityLabel="Export as Markdown"
              onPress={() => handleSelectFormat('markdown')}
              style={[
                styles.formatOption,
                format === 'markdown' && styles.formatOptionActive,
              ]}>
              <Text
                style={[
                  Type.tabLabel,
                  styles.formatText,
                  format === 'markdown' && styles.formatTextActive,
                ]}>
                MARKDOWN (.MD)
              </Text>
            </Pressable>

            <Pressable
              testID="format-text"
              accessibilityRole="button"
              accessibilityLabel="Export as Plain Text"
              onPress={() => handleSelectFormat('text')}
              style={[
                styles.formatOption,
                format === 'text' && styles.formatOptionActive,
              ]}>
              <Text
                style={[
                  Type.tabLabel,
                  styles.formatText,
                  format === 'text' && styles.formatTextActive,
                ]}>
                PLAIN TEXT (.TXT)
              </Text>
            </Pressable>
          </View>

          {/* Preview Box */}
          <View style={styles.previewBox}>
            <View style={styles.previewHeader}>
              <Text style={[Type.stampLabel, styles.previewFormatLabel]}>
                {format === 'markdown' ? 'MARKDOWN PREVIEW' : 'PLAIN TEXT PREVIEW'}
              </Text>
              <Text style={[Type.metaLabel, styles.charCount]}>
                {`${formattedContent.length} chars`}
              </Text>
            </View>
            <ScrollView style={styles.previewScroll} nestedScrollEnabled>
              <Text testID="export-preview-content" style={[Type.bodyText, styles.previewText]}>
                {previewExcerpt}
              </Text>
            </ScrollView>
          </View>

          {/* Dialog Actions */}
          <View style={styles.actions}>
            <Pressable
              testID="export-cancel"
              accessibilityRole="button"
              accessibilityLabel="Cancel export"
              onPress={() => {
                haptics.light();
                onCancel();
              }}
              style={[styles.button, styles.cancelButton]}>
              <Text style={[Type.tabLabel, styles.cancelText]}>CANCEL</Text>
            </Pressable>
            <Pressable
              testID="export-confirm"
              accessibilityRole="button"
              accessibilityLabel="Share note"
              onPress={handleShare}
              style={[styles.button, styles.confirmButton]}>
              <Text style={[Type.tabLabel, styles.confirmText]}>SHARE</Text>
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
  formatRow: {
    flexDirection: 'row',
    gap: Layout.space.xs,
  },
  formatOption: {
    flex: 1,
    paddingVertical: Layout.space.sm,
    paddingHorizontal: Layout.space.xs,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    borderColor: c.border.hairline,
    backgroundColor: c.surface.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatOptionActive: {
    borderColor: c.accent,
    backgroundColor: c.accent,
  },
  formatText: {
    color: c.text.secondary,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  formatTextActive: {
    color: c.text.onKraft,
    fontWeight: '600',
  },
  previewBox: {
    backgroundColor: c.surface.page,
    padding: Layout.space.md,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    borderColor: c.border.hairline,
    gap: 6,
    maxHeight: 160,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewFormatLabel: {
    fontSize: 8.5,
    color: c.accent,
    letterSpacing: 1,
  },
  charCount: {
    fontSize: 9,
    color: c.text.secondary,
  },
  previewScroll: {
    maxHeight: 100,
  },
  previewText: {
    fontSize: 12,
    color: c.text.primary,
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
