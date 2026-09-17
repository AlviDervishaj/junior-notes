import { fireEvent, screen } from '@testing-library/react-native';

import { render } from '../../../tests/support/render';

import { SortSelector } from './sort-selector';

describe('SortSelector', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all sort options', async () => {
    await render(<SortSelector selected="updated_desc" onSelect={onSelect} />);

    expect(screen.getByTestId('sort-selector')).toBeOnTheScreen();
    expect(screen.getByTestId('sort-option-updated_desc')).toBeOnTheScreen();
    expect(screen.getByTestId('sort-option-created_desc')).toBeOnTheScreen();
    expect(screen.getByTestId('sort-option-title_asc')).toBeOnTheScreen();
    expect(screen.getByTestId('sort-option-checklist')).toBeOnTheScreen();
  });

  test('highlights active sort option', async () => {
    await render(<SortSelector selected="title_asc" onSelect={onSelect} />);

    expect(screen.getByTestId('sort-option-title_asc')).toHaveProp('accessibilityState', {
      selected: true,
    });
    expect(screen.getByTestId('sort-option-updated_desc')).toHaveProp('accessibilityState', {
      selected: false,
    });
  });

  test('calls onSelect when an option is pressed', async () => {
    await render(<SortSelector selected="updated_desc" onSelect={onSelect} />);

    await fireEvent.press(screen.getByTestId('sort-option-created_desc'));
    expect(onSelect).toHaveBeenCalledWith('created_desc');

    await fireEvent.press(screen.getByTestId('sort-option-checklist'));
    expect(onSelect).toHaveBeenCalledWith('checklist');
  });
});
