import { fireEvent, screen } from '@testing-library/react-native';

import type { Note } from '@/db/types';
import { render } from '../support/render';

import SearchScreen from '@/app/(tabs)/search';

const NOW = new Date(2026, 8, 9, 14, 32).getTime();

const mockResults: Note[] = [
  {
    id: 1,
    title: 'Grocery list',
    body: 'milk',
    category: null,
    pinned: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

let mockQuery = '';
let mockNotes: Note[] = [];

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/hooks/use-notes', () => ({
  useNotes: (query?: string) => {
    mockQuery = query ?? '';
    return { notes: mockNotes, loading: false, reload: jest.fn() };
  },
}));

describe('SearchScreen', () => {
  beforeEach(() => {
    mockNotes = [];
    mockQuery = '';
  });

  test('prompts for a query before anything is typed', async () => {
    await render(<SearchScreen />);
    expect(screen.getByText('SEARCH YOUR NOTEBOOK')).toBeOnTheScreen();
  });

  test('passes the typed query through to the notes hook', async () => {
    await render(<SearchScreen />);
    await fireEvent.changeText(screen.getByTestId('search-input'), 'coffee');
    expect(mockQuery).toBe('coffee');
  });

  test('shows the not-found state for a query with no matches', async () => {
    await render(<SearchScreen />);
    await fireEvent.changeText(screen.getByTestId('search-input'), 'zzz');
    expect(screen.getByText('NOTHING FILED UNDER…')).toBeOnTheScreen();
  });

  test('renders results with the matched run split out for highlighting', async () => {
    mockNotes = mockResults;
    await render(<SearchScreen />);
    await fireEvent.changeText(screen.getByTestId('search-input'), 'grocery');

    // "Grocery list" splits into the matched "Grocery" and the rest.
    expect(screen.getByText('Grocery')).toBeOnTheScreen();
    expect(screen.getByText(' list')).toBeOnTheScreen();
  });
});
