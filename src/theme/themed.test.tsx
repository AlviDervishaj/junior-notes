import { renderHook, screen } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { type ColorSchemeName, Text, View } from 'react-native';

import { makeThemedStyles, useScheme } from '@/theme/themed';
import { render } from '../../tests/support/render';

let factoryCalls = 0;
const useStyles = makeThemedStyles((c) => {
  factoryCalls += 1;
  return { box: { backgroundColor: c.surface.page } };
});

function Box() {
  const styles = useStyles();
  return <View testID="box" style={styles.box} />;
}

function SchemeLabel() {
  return <Text testID="scheme">{useScheme()}</Text>;
}

describe('makeThemedStyles', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('builds each sheet exactly once, at module load', () => {
    // Two schemes, one factory call each — and rendering must not add more.
    expect(factoryCalls).toBe(2);
  });

  test('resolves light surfaces by default', async () => {
    await render(<Box />);
    expect(screen.getByTestId('box')).toHaveStyle({ backgroundColor: '#EDE3CE' });
    expect(factoryCalls).toBe(2);
  });

  test('resolves dark surfaces when the system is dark', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await render(<Box />);
    expect(screen.getByTestId('box')).toHaveStyle({ backgroundColor: '#1E1912' });
  });

  test('returns a stable, identical object across renders in one scheme', async () => {
    const { result: first } = await renderHook(() => useStyles());
    const { result: second } = await renderHook(() => useStyles());
    expect(first.current).toBe(second.current);
  });
});

describe('useScheme', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('falls back to light when the system scheme is unknown', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('unspecified' as ColorSchemeName);
    await render(<SchemeLabel />);
    expect(screen.getByTestId('scheme')).toHaveTextContent('light');
  });

  test('reports dark when the system is dark', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await render(<SchemeLabel />);
    expect(screen.getByTestId('scheme')).toHaveTextContent('dark');
  });
});
