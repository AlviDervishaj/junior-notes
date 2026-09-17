import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  extractTaskItems,
  getChecklistSummary,
  type TaskItem,
} from '@/lib/checklist';
import { haptics } from '@/lib/haptics';
import { Layout, makeThemedStyles, Type } from '@/theme';

export type InteractiveChecklistProps = {
  body: string;
  onToggleTask: (lineIndex: number) => void;
  onClose?: () => void;
};

export function InteractiveChecklist({
  body,
  onToggleTask,
  onClose,
}: InteractiveChecklistProps) {
  const styles = useStyles();
  const summary = getChecklistSummary(body);
  const tasks = extractTaskItems(body);

  const handleToggle = (task: TaskItem) => {
    if (task.completed) {
      haptics.selection();
    } else {
      haptics.success();
    }
    onToggleTask(task.lineIndex);
  };

  return (
    <View testID="interactive-checklist" style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[Type.stampLabel, styles.headerTitle]}>CHECKLIST</Text>
          {summary.total > 0 && (
            <Text testID="checklist-progress-text" style={[Type.metaLabel, styles.progressLabel]}>
              {`${summary.completed}/${summary.total} COMPLETED (${summary.progress}%)`}
            </Text>
          )}
        </View>
        {onClose && (
          <Pressable
            testID="checklist-close-btn"
            accessibilityRole="button"
            accessibilityLabel="Close checklist mode"
            onPress={() => {
              haptics.light();
              onClose();
            }}
            hitSlop={8}
            style={styles.closeButton}>
            <Text style={[Type.tabLabel, styles.closeButtonText]}>DONE</Text>
          </Pressable>
        )}
      </View>

      {summary.total > 0 && (
        <View style={styles.progressBarTrack}>
          <View
            testID="checklist-progress-bar"
            style={[styles.progressBarFill, { width: `${summary.progress}%` }]}
          />
        </View>
      )}

      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[Type.metaLabel, styles.emptyText]}>
            NO TASKS FOUND IN THIS NOTE
          </Text>
          <Text style={[Type.excerpt, styles.emptySubtext]}>
            Use the ☑ button in the toolbar to add checklist items.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.taskList}
          keyboardShouldPersistTaps="always">
          {tasks.map((task) => {
            const indentLevel = Math.min(Math.floor(task.indent.length / 2), 4);
            const indentMargin = indentLevel * Layout.space.md;

            return (
              <Pressable
                key={`task-${task.lineIndex}`}
                testID={`task-item-${task.lineIndex}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.completed }}
                accessibilityLabel={`${task.completed ? 'Completed' : 'Incomplete'}: ${task.text}`}
                onPress={() => handleToggle(task)}
                style={({ pressed }) => [
                  styles.taskRow,
                  { marginLeft: indentMargin },
                  pressed && styles.taskRowPressed,
                ]}>
                <View
                  testID={`task-checkbox-${task.lineIndex}`}
                  style={[
                    styles.checkbox,
                    task.completed && styles.checkboxCompleted,
                  ]}>
                  {task.completed && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text
                  style={[
                    Type.bodyText,
                    styles.taskText,
                    task.completed && styles.taskTextCompleted,
                  ]}>
                  {task.text || '(empty item)'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((c) => ({
  container: {
    backgroundColor: c.surface.card,
    borderRadius: Layout.radius.card,
    borderWidth: Layout.hairline,
    borderColor: c.border.card,
    padding: Layout.space.md,
    marginVertical: Layout.space.sm,
    gap: Layout.space.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.space.sm,
    flexWrap: 'wrap',
  },
  headerTitle: {
    color: c.text.primary,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  progressLabel: {
    color: c.text.secondary,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  closeButton: {
    paddingHorizontal: Layout.space.sm,
    paddingVertical: 3,
    borderRadius: Layout.radius.chip,
    borderWidth: Layout.hairline,
    borderColor: c.border.hairline,
    backgroundColor: 'transparent',
  },
  closeButtonText: {
    color: c.accent,
    fontSize: 10,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: c.accent,
    borderRadius: 2,
  },
  taskList: {
    gap: Layout.space.xs,
    paddingTop: Layout.space.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.space.sm,
    paddingVertical: 6,
    paddingHorizontal: Layout.space.xs,
    borderRadius: Layout.radius.chip,
  },
  taskRowPressed: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: c.border.hairline,
    backgroundColor: c.surface.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  checkmark: {
    color: c.text.onKraft,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
  },
  taskText: {
    flex: 1,
    color: c.text.primary,
    fontSize: 13,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: c.text.secondary,
    opacity: 0.7,
  },
  emptyState: {
    paddingVertical: Layout.space.md,
    alignItems: 'center',
    gap: 4,
  },
  emptyText: {
    color: c.text.secondary,
    fontSize: 9.5,
    letterSpacing: 1,
  },
  emptySubtext: {
    color: c.text.secondary,
    fontSize: 11,
    textAlign: 'center',
  },
}));
