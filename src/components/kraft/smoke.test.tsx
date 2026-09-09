import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

// RNTL v14 renders asynchronously (React 19 concurrent) — render must be awaited
// or `screen` stays unpopulated.
test('native project renders react native components', async () => {
  await render(<Text>hello</Text>);
  expect(screen.getByText('hello')).toBeOnTheScreen();
});
