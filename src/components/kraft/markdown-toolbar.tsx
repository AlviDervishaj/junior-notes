import { Pressable, ScrollView, Text, View } from 'react-native';

import type { MarkdownAction } from '@/lib/checklist';
import { haptics } from '@/lib/haptics';
import { Layout, makeThemedStyles, Type } from '@/theme';

export type MarkdownToolbarProps = {
  onAction: (action: MarkdownAction) => void;
};

type ToolbarButton = {
  id: MarkdownAction;
  label: string;
  accessibilityLabel: string;
  testID: string;
};

const BUTTONS: ToolbarButton[] = [
  { id: 'task', label: '☑', accessibilityLabel: 'Checklist task item', testID: 'markdown-action-task' },
  { id: 'heading', label: 'H', accessibilityLabel: 'Heading', testID: 'markdown-action-heading' },
  { id: 'bullet', label: '•', accessibilityLabel: 'Bullet list', testID: 'markdown-action-bullet' },
  { id: 'numbered', label: '1.', accessibilityLabel: 'Numbered list', testID: 'markdown-action-numbered' },
  { id: 'bold', label: 'B', accessibilityLabel: 'Bold text', testID: 'markdown-action-bold' },
  { id: 'italic', label: 'I', accessibilityLabel: 'Italic text', testID: 'markdown-action-italic' },
  { id: 'quote', label: '"', accessibilityLabel: 'Blockquote', testID: 'markdown-action-quote' },
  { id: 'divider', label: '—', accessibilityLabel: 'Horizontal rule divider', testID: 'markdown-action-divider' },
];

export function MarkdownToolbar({ onAction }: MarkdownToolbarProps) {
  const styles = useStyles();

  return (
    <View testID="markdown-toolbar" style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always">
        {BUTTONS.map((btn) => (
          <Pressable
            key={btn.id}
            testID={btn.testID}
            accessibilityRole="button"
            accessibilityLabel={btn.accessibilityLabel}
            onPress={() => {
              haptics.selection();
              onAction(btn.id);
            }}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text
              style={[
                Type.tabLabel,
                styles.buttonText,
                btn.id === 'bold' && styles.boldText,
                btn.id === 'italic' && styles.italicText,
              ]}>
              {btn.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeThemedStyles((c) => ({
  container: {
    backgroundColor: c.surface.card,
    borderTopWidth: Layout.hairline,
    borderTopColor: c.border.hairline,
    paddingVertical: Layout.space.xs,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.space.md,
    gap: Layout.space.xs,
  },
  button: {
    paddingHorizontal: Layout.space.sm + 2,
    paddingVertical: 6,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    borderColor: c.border.hairline,
    backgroundColor: 'transparent',
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    opacity: 0.7,
  },
  buttonText: {
    color: c.text.primary,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  boldText: {
    fontWeight: '700',
  },
  italicText: {
    fontStyle: 'italic',
  },
}));
