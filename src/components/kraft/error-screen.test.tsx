import { fireEvent, screen } from '@testing-library/react-native';

import { render } from '../../../tests/support/render';

import { ErrorScreen } from './error-screen';

describe('ErrorScreen', () => {
  test('shows the title and the underlying detail', async () => {
    await render(<ErrorScreen title="Could not open your notebook" detail="disk I/O error" />);
    expect(screen.getByText('Could not open your notebook')).toBeOnTheScreen();
    expect(screen.getByText('disk I/O error')).toBeOnTheScreen();
  });

  test('omits the retry affordance when there is nothing to retry', async () => {
    await render(<ErrorScreen title="Broken" detail="why" />);
    expect(screen.queryByTestId('error-retry')).toBeNull();
  });

  test('calls onRetry when offered and pressed', async () => {
    const onRetry = jest.fn();
    await render(<ErrorScreen title="Broken" detail="why" onRetry={onRetry} />);

    await fireEvent.press(screen.getByTestId('error-retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
