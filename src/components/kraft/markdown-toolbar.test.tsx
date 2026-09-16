import { fireEvent, screen } from '@testing-library/react-native';

import { render } from '../../../tests/support/render';

import { MarkdownToolbar } from './markdown-toolbar';

describe('MarkdownToolbar', () => {
  const onAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all markdown action buttons', async () => {
    await render(<MarkdownToolbar onAction={onAction} />);

    expect(screen.getByTestId('markdown-action-task')).toBeOnTheScreen();
    expect(screen.getByTestId('markdown-action-heading')).toBeOnTheScreen();
    expect(screen.getByTestId('markdown-action-bullet')).toBeOnTheScreen();
    expect(screen.getByTestId('markdown-action-numbered')).toBeOnTheScreen();
    expect(screen.getByTestId('markdown-action-bold')).toBeOnTheScreen();
    expect(screen.getByTestId('markdown-action-italic')).toBeOnTheScreen();
    expect(screen.getByTestId('markdown-action-quote')).toBeOnTheScreen();
    expect(screen.getByTestId('markdown-action-divider')).toBeOnTheScreen();
  });

  test('calls onAction when action buttons are pressed', async () => {
    await render(<MarkdownToolbar onAction={onAction} />);

    await fireEvent.press(screen.getByTestId('markdown-action-task'));
    expect(onAction).toHaveBeenCalledWith('task');

    await fireEvent.press(screen.getByTestId('markdown-action-heading'));
    expect(onAction).toHaveBeenCalledWith('heading');

    await fireEvent.press(screen.getByTestId('markdown-action-bold'));
    expect(onAction).toHaveBeenCalledWith('bold');
  });
});
