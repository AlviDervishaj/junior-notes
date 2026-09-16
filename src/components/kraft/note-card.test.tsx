import { fireEvent, screen } from '@testing-library/react-native';

import type { Note } from '@/db/types';
import { render } from '../../../tests/support/render';

import { NoteCard } from './note-card';

const NOW = new Date(2026, 8, 9, 14, 32).getTime();

const note = (over: Partial<Note> = {}): Note => ({
  id: 1,
  title: 'Grocery list',
  body: 'milk · the good coffee · bread',
  category: null,
  pinned: false,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

describe('NoteCard', () => {
  test('shows the title and a body excerpt', async () => {
    await render(<NoteCard note={note()} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByText('Grocery list')).toBeOnTheScreen();
    expect(screen.getByText('milk · the good coffee · bread')).toBeOnTheScreen();
  });

  test('shows the formatted date', async () => {
    await render(<NoteCard note={note()} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByText('TODAY 14:32')).toBeOnTheScreen();
  });

  test('shows a placeholder title for an untitled note', async () => {
    await render(<NoteCard note={note({ title: '' })} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByText('Untitled')).toBeOnTheScreen();
  });

  test('shows the pinned chip only when pinned', async () => {
    await render(<NoteCard note={note({ pinned: true })} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByText('PINNED')).toBeOnTheScreen();
  });

  test('omits the pinned chip when not pinned', async () => {
    await render(<NoteCard note={note()} now={NOW} onPress={jest.fn()} />);
    expect(screen.queryByText('PINNED')).toBeNull();
  });

  test('renders the category square when categorised', async () => {
    await render(<NoteCard note={note({ category: 'lists' })} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByTestId('category-square-lists')).toBeOnTheScreen();
    expect(screen.getByTestId('note-category-badge-1')).toBeOnTheScreen();
    expect(screen.getByText('LISTS')).toBeOnTheScreen();
  });

  test('calls onPress with the note id', async () => {
    const onPress = jest.fn();
    await render(<NoteCard note={note({ id: 42 })} now={NOW} onPress={onPress} />);

    await fireEvent.press(screen.getByTestId('note-card-42'));

    expect(onPress).toHaveBeenCalledWith(42);
  });

  test('renders an empty body without crashing', async () => {
    await render(<NoteCard note={note({ body: '' })} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByText('Grocery list')).toBeOnTheScreen();
  });
});
