import { fireEvent, screen } from '@testing-library/react-native';

import { render } from '../support/render';

import EditorScreen from '@/app/note/[id]';

const mockCreateNote = jest.fn().mockResolvedValue(7);
const mockUpdateNote = jest.fn().mockResolvedValue(undefined);
const mockHardDelete = jest.fn().mockResolvedValue(undefined);
const mockSoftDelete = jest.fn().mockResolvedValue(undefined);
const mockSetPinned = jest.fn().mockResolvedValue(undefined);
const mockSetCategory = jest.fn().mockResolvedValue(undefined);
const mockSplitNote = jest.fn().mockResolvedValue(8);
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
  splitNote: (...args: unknown[]) => mockSplitNote(...args),
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

  test('split action prompts confirmation dialog with preview and splits note on confirm', async () => {
    mockNote = {
      id: 3,
      title: 'Full Meeting',
      body: 'Top topic\n---\nBottom topic',
      category: 'ideas',
      pinned: false,
      createdAt: 1,
      updatedAt: 1,
    };

    await render(<EditorScreen />);

    await fireEvent.press(screen.getByTestId('action-split'));

    expect(screen.getAllByText('SPLIT NOTE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('split-preview-part1')).toBeOnTheScreen();
    expect(screen.getByTestId('split-preview-part2')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('split-confirm-accept'));

    expect(mockSplitNote).toHaveBeenCalledWith(
      {},
      3,
      {
        firstTitle: 'Full Meeting',
        firstBody: 'Top topic',
        secondTitle: 'Full Meeting (Part 2)',
        secondBody: 'Bottom topic',
        category: 'ideas',
      },
      expect.any(Number)
    );
  });

  test('share action prompts export dialog and invokes shareNoteContent on confirm', async () => {
    mockNote = {
      id: 3,
      title: 'Weekly Standup',
      body: 'Review sprint progress',
      category: 'notes',
      pinned: false,
      createdAt: 1,
      updatedAt: 1,
    };

    await render(<EditorScreen />);

    await fireEvent.press(screen.getByTestId('action-share'));

    expect(screen.getByText('EXPORT & SHARE')).toBeOnTheScreen();
    expect(screen.getByText('MARKDOWN PREVIEW')).toBeOnTheScreen();
    expect(screen.getByTestId('export-preview-content')).toHaveTextContent(
      '# Weekly Standup\n\n*Category: Notes*\n\nReview sprint progress'
    );

    await fireEvent.press(screen.getByTestId('export-confirm'));
    expect(screen.queryByText('EXPORT & SHARE')).toBeNull();
  });
});

describe('EditorScreen markdown toolbar', () => {
  beforeEach(() => {
    mockParams = { id: 'new' };
    mockNote = null;
    mockLoading = false;
    jest.clearAllMocks();
  });

  test('renders markdown toolbar and buttons', async () => {
    await render(<EditorScreen />);

    expect(screen.getByTestId('markdown-toolbar')).toBeOnTheScreen();
    expect(screen.getByTestId('markdown-action-task')).toBeOnTheScreen();
    expect(screen.getByTestId('markdown-action-heading')).toBeOnTheScreen();
    expect(screen.getByTestId('markdown-action-bold')).toBeOnTheScreen();
  });

  test('applies task markdown formatting to current body text', async () => {
    await render(<EditorScreen />);
    const bodyInput = screen.getByTestId('body-input');

    await fireEvent.changeText(bodyInput, 'Buy coffee');
    await fireEvent(bodyInput, 'selectionChange', {
      nativeEvent: { selection: { start: 0, end: 0 } },
    });

    await fireEvent.press(screen.getByTestId('markdown-action-task'));

    expect(bodyInput).toHaveProp('value', '- [ ] Buy coffee');
  });

  test('applies bold formatting to selected text in note body', async () => {
    await render(<EditorScreen />);
    const bodyInput = screen.getByTestId('body-input');

    await fireEvent.changeText(bodyInput, 'Important note');
    await fireEvent(bodyInput, 'selectionChange', {
      nativeEvent: { selection: { start: 0, end: 9 } },
    });

    await fireEvent.press(screen.getByTestId('markdown-action-bold'));

    expect(bodyInput).toHaveProp('value', '**Important** note');
  });

  test('inserts horizontal divider into note body', async () => {
    await render(<EditorScreen />);
    const bodyInput = screen.getByTestId('body-input');

    await fireEvent.changeText(bodyInput, 'Section 1');
    await fireEvent(bodyInput, 'selectionChange', {
      nativeEvent: { selection: { start: 9, end: 9 } },
    });

    await fireEvent.press(screen.getByTestId('markdown-action-divider'));

    expect(bodyInput).toHaveProp('value', 'Section 1\n---\n');
  });
});
