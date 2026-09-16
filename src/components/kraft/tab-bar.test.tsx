import { fireEvent, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { render } from '../../../tests/support/render';

import { KraftTabBar, TAB_LABELS } from './tab-bar';

/**
 * Minimal stand-in for the navigator props. Only the fields the tab bar reads
 * are populated, so the shape is cast rather than fully constructed.
 */
function makeProps(
  activeIndex = 0,
  emit = jest.fn(),
  navigate = jest.fn()
): BottomTabBarProps {
  return {
    state: {
      index: activeIndex,
      routes: [
        { key: 'index-1', name: 'index' },
        { key: 'search-1', name: 'search' },
        { key: 'trash-1', name: 'trash' },
      ],
    },
    navigation: { emit, navigate },
    descriptors: {},
  } as unknown as BottomTabBarProps;
}

describe('KraftTabBar', () => {
  test('renders a label for each route', async () => {
    await render(<KraftTabBar {...makeProps()} />);
    expect(screen.getByText(TAB_LABELS.index)).toBeOnTheScreen();
    expect(screen.getByText(TAB_LABELS.search)).toBeOnTheScreen();
    expect(screen.getByText(TAB_LABELS.trash)).toBeOnTheScreen();
  });

  test('tints the active tab with the accent colour', async () => {
    await render(<KraftTabBar {...makeProps(0)} />);
    expect(screen.getByText(TAB_LABELS.index)).toHaveStyle({ color: '#9C4A33' });
  });

  test('renders inactive tabs in the secondary colour', async () => {
    await render(<KraftTabBar {...makeProps(0)} />);
    expect(screen.getByText(TAB_LABELS.search)).toHaveStyle({ color: '#8A7C64' });
  });

  test('pressing an inactive tab emits tabPress and navigates', async () => {
    const emit = jest.fn().mockReturnValue({ defaultPrevented: false });
    const navigate = jest.fn();
    await render(<KraftTabBar {...makeProps(0, emit, navigate)} />);

    await fireEvent.press(screen.getByTestId('tab-search'));

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'search-1' })
    );
    expect(navigate).toHaveBeenCalledWith('search');
  });

  test('does not navigate when the press is default-prevented', async () => {
    const emit = jest.fn().mockReturnValue({ defaultPrevented: true });
    const navigate = jest.fn();
    await render(<KraftTabBar {...makeProps(0, emit, navigate)} />);

    await fireEvent.press(screen.getByTestId('tab-search'));

    expect(navigate).not.toHaveBeenCalled();
  });

  test('does not navigate when pressing the already-active tab', async () => {
    const emit = jest.fn().mockReturnValue({ defaultPrevented: false });
    const navigate = jest.fn();
    await render(<KraftTabBar {...makeProps(0, emit, navigate)} />);

    await fireEvent.press(screen.getByTestId('tab-index'));

    expect(navigate).not.toHaveBeenCalled();
  });
});
