import { fireEvent, screen } from '@testing-library/react-native';

import { render } from '../../../tests/support/render';

import { ConfirmDialog } from './confirm-dialog';
import { UndoBar } from './undo-bar';

describe('ConfirmDialog', () => {
  test('renders nothing when not visible', async () => {
    await render(
      <ConfirmDialog
        visible={false}
        title="Delete?"
        confirmLabel="DELETE"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.queryByText('Delete?')).toBeNull();
  });

  test('shows the title and detail when visible', async () => {
    await render(
      <ConfirmDialog
        visible
        title="Delete this note?"
        detail="You can undo this from the notebook."
        confirmLabel="DELETE"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByText('Delete this note?')).toBeOnTheScreen();
    expect(screen.getByText('You can undo this from the notebook.')).toBeOnTheScreen();
  });

  test('calls onConfirm when the confirm button is pressed', async () => {
    const onConfirm = jest.fn();
    await render(
      <ConfirmDialog
        visible
        title="Delete?"
        confirmLabel="DELETE"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );
    await fireEvent.press(screen.getByTestId('confirm-accept'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel when the cancel button is pressed', async () => {
    const onCancel = jest.fn();
    await render(
      <ConfirmDialog
        visible
        title="Delete?"
        confirmLabel="DELETE"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );
    await fireEvent.press(screen.getByTestId('confirm-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('UndoBar', () => {
  test('renders nothing when not visible', async () => {
    await render(
      <UndoBar visible={false} message="Note deleted" onUndo={jest.fn()} onDismiss={jest.fn()} />
    );
    expect(screen.queryByText('Note deleted')).toBeNull();
  });

  test('shows the message and calls onUndo', async () => {
    const onUndo = jest.fn();
    await render(
      <UndoBar visible message="Note deleted" onUndo={onUndo} onDismiss={jest.fn()} />
    );

    expect(screen.getByText('Note deleted')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('undo-action'));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  test('dismisses itself after the timeout', async () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();
    try {
      await render(
        <UndoBar
          visible
          message="Note deleted"
          onUndo={jest.fn()}
          onDismiss={onDismiss}
          timeoutMs={5000}
        />
      );
      expect(onDismiss).not.toHaveBeenCalled();
      jest.advanceTimersByTime(5000);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
