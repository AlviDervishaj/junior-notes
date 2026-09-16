import { screen } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

import { render } from '../../../tests/support/render';
import { Paper } from './paper';

describe('Paper', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('uses the light page dot-grid by default', async () => {
    await render(<Paper testID="paper" />);
    const img = screen.getByTestId('paper');
    expect(img.props.source).toEqual(expect.objectContaining({ testUri: expect.stringContaining('dot-grid.png') }));
    expect(img.parent).toHaveStyle({ backgroundColor: '#EDE3CE' });
  });

  test('uses the dark page dot-grid when the system is dark', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await render(<Paper testID="paper" />);
    const img = screen.getByTestId('paper');
    expect(img.props.source).toEqual(expect.objectContaining({ testUri: expect.stringContaining('dot-grid-dark.png') }));
    expect(img.parent).toHaveStyle({ backgroundColor: '#1E1912' });
  });
});
