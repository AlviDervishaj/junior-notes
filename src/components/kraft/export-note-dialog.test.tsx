import { fireEvent, screen } from '@testing-library/react-native';

import { ExportNoteDialog } from './export-note-dialog';
import { render } from '../../../tests/support/render';

describe('ExportNoteDialog', () => {
  const onShare = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing when not visible', async () => {
    await render(
      <ExportNoteDialog
        visible={false}
        title="Test Note"
        body="Note content"
        onShare={onShare}
        onCancel={onCancel}
      />
    );
    expect(screen.queryByText('EXPORT & SHARE')).toBeNull();
  });

  test('renders markdown preview by default', async () => {
    await render(
      <ExportNoteDialog
        visible
        title="Test Note"
        body="Note content"
        categoryLabel="Ideas"
        onShare={onShare}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('EXPORT & SHARE')).toBeOnTheScreen();
    expect(screen.getByText('MARKDOWN PREVIEW')).toBeOnTheScreen();
    expect(screen.getByTestId('export-preview-content')).toHaveTextContent(
      '# Test Note\n\n*Category: Ideas*\n\nNote content'
    );
  });

  test('switches between markdown and plain text formats', async () => {
    await render(
      <ExportNoteDialog
        visible
        title="Shopping List"
        body="Milk, Eggs"
        categoryLabel="Lists"
        onShare={onShare}
        onCancel={onCancel}
      />
    );

    await fireEvent.press(screen.getByTestId('format-text'));
    expect(screen.getByText('PLAIN TEXT PREVIEW')).toBeOnTheScreen();
    expect(screen.getByTestId('export-preview-content')).toHaveTextContent(
      'Shopping List\n\n[LISTS]\n\nMilk, Eggs'
    );

    await fireEvent.press(screen.getByTestId('format-markdown'));
    expect(screen.getByText('MARKDOWN PREVIEW')).toBeOnTheScreen();
    expect(screen.getByTestId('export-preview-content')).toHaveTextContent(
      '# Shopping List\n\n*Category: Lists*\n\nMilk, Eggs'
    );
  });

  test('calls onCancel when cancel button is pressed', async () => {
    await render(
      <ExportNoteDialog
        visible
        title="Test Note"
        body="Body"
        onShare={onShare}
        onCancel={onCancel}
      />
    );

    await fireEvent.press(screen.getByTestId('export-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onShare).not.toHaveBeenCalled();
  });

  test('calls onShare with selected format when share button is pressed', async () => {
    await render(
      <ExportNoteDialog
        visible
        title="Test Note"
        body="Body"
        onShare={onShare}
        onCancel={onCancel}
      />
    );

    await fireEvent.press(screen.getByTestId('format-text'));
    await fireEvent.press(screen.getByTestId('export-confirm'));

    expect(onShare).toHaveBeenCalledWith('text');
  });
});
