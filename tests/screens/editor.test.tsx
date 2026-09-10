import { fireEvent, screen } from '@testing-library/react-native';

import { render } from '../support/render';

import EditorScreen from '@/app/note/[id]';

const mockCreateNote = jest.fn().mockResolvedValue(7);
const mockUpdateNote = jest.fn().mockResolvedValue(undefined);
const mockHardDelete = jest.fn().mockResolvedValue(undefined);
const mockSoftDelete = jest.fn().mockResolvedValue(undefined);
const mockSetPinned = jest.fn().mockResolvedValue(undefined);
const mockSetCategory = jest.fn().mockResolvedValue(undefined);
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: { id: string } = { id: 'new' };
let mockNote: unknown = null;
let mockLoading = false;

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack, replace: mockReplace, push: jest.fn() }),
}));

jest.mock('@/db/notes', () => ({
  createNote: (...args: unknown[]) => mockCreateNote(...args),
  updateNote: (...args: unknown[]) => mockUpdateNote(...args),
  hardDelete: (...args: unknown[]) => mockHardDelete(...args),
  softDelete: (...args: unknown[]) => mockSoftDelete(...args),
  setPinned: (...args: unknown[]) => mockSetPinned(...args),
  setCategory: (...args: unknown[]) => mockSetCategory(...args),
}));

jest.mock('@/hooks/use-note', () => ({
  useNote: () => ({ note: mockNote, loading: mockLoading }),
}));

describe('EditorScreen', () => {
  beforeEach(() => {
    mockParams = { id: 'new' };
    mockNote = null;
    mockLoading = false;
    jest.clearAllMocks();
    mockCreateNote.mockResolvedValue(7);
  });

  test('renders empty inputs for a new note', async () => {
    await render(<EditorScreen />);
    expect(screen.getByTestId('title-input')).toHaveProp('value', '');
    expect(screen.getByTestId('body-input')).toHaveProp('value', '');
  });

  test('shows a zero word count for a new note', async () => {
    await render(<EditorScreen />);
    expect(screen.getByText(/0 WORDS/)).toBeOnTheScreen();
  });

  test('hydrates the inputs from an existing note', async () => {
    mockParams = { id: '3' };
    mockNote = {
      id: 3,
      title: 'On the new flat',
      body: 'boiler service record',
      category: null,
      pinned: false,
      createdAt: 1,
      updatedAt: 1,
    };

    await render(<EditorScreen />);

    expect(screen.getByTestId('title-input')).toHaveProp('value', 'On the new flat');
    expect(screen.getByTestId('body-input')).toHaveProp('value', 'boiler service record');
  });

  test('updates the word count as the body is typed', async () => {
    await render(<EditorScreen />);
    await fireEvent.changeText(screen.getByTestId('body-input'), 'three little words');
    expect(screen.getByText(/3 WORDS/)).toBeOnTheScreen();
  });

  test('redirects to the list when the note id does not exist', async () => {
    mockParams = { id: '404' };
    mockNote = null;
    mockLoading = false;

    await render(<EditorScreen />);

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  test('does not redirect while the note is still loading', async () => {
    mockParams = { id: '3' };
    mockNote = null;
    mockLoading = true;

    await render(<EditorScreen />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('discards an untouched new note on the way out', async () => {
    await render(<EditorScreen />);
    await fireEvent.press(screen.getByTestId('editor-back'));
    expect(mockBack).toHaveBeenCalled();
    expect(mockCreateNote).not.toHaveBeenCalled();
  });
});

describe('EditorScreen actions', () => {
  const saved = {
    id: 3,
    title: 'On the new flat',
    body: 'boiler service record',
    category: null,
    pinned: false,
    createdAt: 1,
    updatedAt: 1,
  };

  beforeEach(() => {
    mockParams = { id: '3' };
    mockNote = saved;
    mockLoading = false;
    jest.clearAllMocks();
  });

  test('delete asks for confirmation before removing anything', async () => {
    await render(<EditorScreen />);

    await fireEvent.press(screen.getByTestId('action-delete'));

    expect(screen.getByText('Delete this note?')).toBeOnTheScreen();
    expect(mockSoftDelete).not.toHaveBeenCalled();
  });

  test('cancelling the confirmation leaves the note alone', async () => {
    await render(<EditorScreen />);

    await fireEvent.press(screen.getByTestId('action-delete'));
    await fireEvent.press(screen.getByTestId('confirm-cancel'));

    expect(mockSoftDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete this note?')).toBeNull();
  });

  test('confirming soft-deletes and hands the id back for undo', async () => {
    await render(<EditorScreen />);

    await fireEvent.press(screen.getByTestId('action-delete'));
    await fireEvent.press(screen.getByTestId('confirm-accept'));

    expect(mockSoftDelete).toHaveBeenCalledWith({}, 3, expect.any(Number));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/',
      params: { deleted: '3' },
    });
  });

  test('the pin action reflects the note state and toggles it', async () => {
    await render(<EditorScreen />);

    expect(screen.getByText('PIN')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('action-pin'));

    expect(mockSetPinned).toHaveBeenCalledWith({}, 3, true, expect.any(Number));
    expect(screen.getByText('UNPIN')).toBeOnTheScreen();
  });

  test('choosing a category sets it, and choosing it again clears it', async () => {
    await render(<EditorScreen />);

    await fireEvent.press(screen.getByTestId('action-category-home'));
    expect(mockSetCategory).toHaveBeenLastCalledWith({}, 3, 'home', expect.any(Number));

    await fireEvent.press(screen.getByTestId('action-category-home'));
    expect(mockSetCategory).toHaveBeenLastCalledWith({}, 3, null, expect.any(Number));
  });
});
