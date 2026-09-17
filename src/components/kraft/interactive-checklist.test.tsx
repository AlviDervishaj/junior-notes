import { fireEvent, screen } from '@testing-library/react-native';

import { render } from '../../../tests/support/render';

import { InteractiveChecklist } from './interactive-checklist';

describe('InteractiveChecklist', () => {
  const onToggleTask = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty state when there are no checklist tasks', async () => {
    await render(
      <InteractiveChecklist
        body="Plain text without tasks"
        onToggleTask={onToggleTask}
      />
    );

    expect(screen.getByText('NO TASKS FOUND IN THIS NOTE')).toBeOnTheScreen();
    expect(
      screen.getByText('Use the ☑ button in the toolbar to add checklist items.')
    ).toBeOnTheScreen();
  });

  test('renders checklist items, progress text, and progress bar', async () => {
    const body = '# Tasks\n- [ ] Buy groceries\n- [x] Walk the dog';

    await render(
      <InteractiveChecklist
        body={body}
        onToggleTask={onToggleTask}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('interactive-checklist')).toBeOnTheScreen();
    expect(screen.getByTestId('checklist-progress-text')).toHaveTextContent(
      '1/2 COMPLETED (50%)'
    );
    expect(screen.getByTestId('checklist-progress-bar')).toBeOnTheScreen();
    expect(screen.getByText('Buy groceries')).toBeOnTheScreen();
    expect(screen.getByText('Walk the dog')).toBeOnTheScreen();
    expect(screen.getByTestId('task-item-1')).toHaveProp('accessibilityState', {
      checked: false,
    });
    expect(screen.getByTestId('task-item-2')).toHaveProp('accessibilityState', {
      checked: true,
    });
  });

  test('calls onToggleTask with correct lineIndex when task is clicked', async () => {
    const body = '- [ ] Buy groceries\n- [x] Walk the dog';

    await render(
      <InteractiveChecklist body={body} onToggleTask={onToggleTask} />
    );

    await fireEvent.press(screen.getByTestId('task-item-0'));
    expect(onToggleTask).toHaveBeenCalledWith(0);

    await fireEvent.press(screen.getByTestId('task-item-1'));
    expect(onToggleTask).toHaveBeenCalledWith(1);
  });

  test('calls onClose when done button is pressed', async () => {
    const body = '- [ ] Buy groceries';

    await render(
      <InteractiveChecklist
        body={body}
        onToggleTask={onToggleTask}
        onClose={onClose}
      />
    );

    await fireEvent.press(screen.getByTestId('checklist-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
