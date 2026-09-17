import { screen } from '@testing-library/react-native';

import type { Note } from '@/db/types';
import { render } from '../support/render';

import NotesScreen from '@/app/(tabs)/index';

const NOW = new Date(2026, 8, 9, 14, 32).getTime();

const baseNotes: Note[] = [
  {
    id: 1,
    title: 'Grocery list',
    body: 'milk',
    category: 'lists',
    pinned: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

// jest.mock factories may only close over variables whose names begin with
// `mock`, so these carry the prefix.
let mockNotes: Note[] = baseNotes;
const mockReload = jest.fn();
const mockPush = jest.fn();

jest.mock('@/hooks/use-notes', () => ({
  useNotes: () => ({ notes: mockNotes, loading: false, reload: mockReload }),
}));

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

describe('NotesScreen', () => {
  beforeEach(() => {
    mockNotes = baseNotes;
    mockPush.mockClear();
  });

  test('renders the cover title', async () => {
    await render(<NotesScreen />);
    expect(screen.getByText('Notebook')).toBeOnTheScreen();
  });

  test('renders a card per note', async () => {
    await render(<NotesScreen />);
    expect(screen.getByText('Grocery list')).toBeOnTheScreen();
  });

  test('pluralises the entry count', async () => {
    await render(<NotesScreen />);
    expect(screen.getByText('1 ENTRY · ALL SAVED')).toBeOnTheScreen();
  });

  test('shows the empty state when there are no notes', async () => {
    mockNotes = [];
    await render(<NotesScreen />);
    expect(screen.getByText('NO ENTRIES YET')).toBeOnTheScreen();
  });

  test('renders category filter buttons', async () => {
    await render(<NotesScreen />);
    expect(screen.getByTestId('category-filter-all')).toBeOnTheScreen();
    expect(screen.getByTestId('category-filter-lists')).toBeOnTheScreen();
    expect(screen.getByTestId('category-filter-ideas')).toBeOnTheScreen();
  });

  test('renders sort selector and options', async () => {
    await render(<NotesScreen />);
    expect(screen.getByTestId('sort-selector')).toBeOnTheScreen();
    expect(screen.getByTestId('sort-option-updated_desc')).toBeOnTheScreen();
    expect(screen.getByTestId('sort-option-created_desc')).toBeOnTheScreen();
    expect(screen.getByTestId('sort-option-title_asc')).toBeOnTheScreen();
    expect(screen.getByTestId('sort-option-checklist')).toBeOnTheScreen();
  });
});
