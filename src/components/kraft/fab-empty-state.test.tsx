import { screen } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

import { render } from '../../../tests/support/render';

import { EmptyState } from './empty-state';
import { Fab } from './fab';

describe('Fab', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('uses the light accent by default', async () => {
    await render(<Fab accessibilityLabel="New note" onPress={jest.fn()} />);
    expect(screen.getByTestId('fab')).toHaveStyle({ backgroundColor: '#9C4A33' });
  });

  test('uses the dark accent when the system is dark', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await render(<Fab accessibilityLabel="New note" onPress={jest.fn()} />);
    expect(screen.getByTestId('fab')).toHaveStyle({ backgroundColor: '#D4785A' });
  });
});

describe('EmptyState', () => {
  test('renders its title and detail', async () => {
    await render(<EmptyState stamp="blank page" title="NO ENTRIES YET" detail="Tap below." />);
    expect(screen.getByText('NO ENTRIES YET')).toBeOnTheScreen();
    expect(screen.getByText('Tap below.')).toBeOnTheScreen();
  });

  test('omits the detail when not given', async () => {
    await render(<EmptyState stamp="blank page" title="NO ENTRIES YET" />);
    expect(screen.queryByText('Tap below.')).toBeNull();
  });
});
