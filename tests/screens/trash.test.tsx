import { fireEvent, screen } from '@testing-library/react-native';

import TrashScreen from '@/app/(tabs)/trash';
import { emptyTrash, hardDelete, restore } from '@/db/notes';
import type { DeletedNote } from '@/db/types';
import { render } from '../support/render';

const NOW = new Date(2026, 8, 9, 14, 32).getTime();

const baseDeletedNotes: DeletedNote[] = [
  {
    id: 101,
    title: 'Discarded Plan',
    body: 'old roadmap',
    category: 'ideas',
    pinned: false,
    createdAt: NOW - 100_000,
    updatedAt: NOW - 50_000,
    deletedAt: NOW - 10_000,
  },
];

let mockNotes: DeletedNote[] = baseDeletedNotes;
const mockReload = jest.fn();

jest.mock('@/hooks/use-notes', () => ({
  useTrashNotes: () => ({ notes: mockNotes, loading: false, reload: mockReload }),
}));

jest.mock('@/db/notes', () => ({
  restore: jest.fn(),
  hardDelete: jest.fn(),
  emptyTrash: jest.fn(),
}));

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
}));

describe('TrashScreen', () => {
  beforeEach(() => {
    mockNotes = baseDeletedNotes;
    jest.clearAllMocks();
  });

  test('renders the cover header and deleted notes', async () => {
    await render(<TrashScreen />);
    expect(screen.getByText('Trash')).toBeOnTheScreen();
    expect(screen.getByText('Discarded Plan')).toBeOnTheScreen();
    expect(screen.getByText('1 ITEM · AUTO-PURGES IN 30 DAYS')).toBeOnTheScreen();
    expect(screen.getByTestId('empty-trash-button')).toBeOnTheScreen();
  });

  test('shows empty state when no notes in trash', async () => {
    mockNotes = [];
    await render(<TrashScreen />);
    expect(screen.getByText('TRASH IS EMPTY')).toBeOnTheScreen();
    expect(
      screen.getByText('Deleted notes are kept for 30 days before being permanently removed.')
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('empty-trash-button')).toBeNull();
  });

  test('restores note when RESTORE button is pressed', async () => {
    await render(<TrashScreen />);
    await fireEvent.press(screen.getByTestId('trash-restore-101'));

    expect(restore).toHaveBeenCalledWith(expect.anything(), 101);
    expect(mockReload).toHaveBeenCalled();
  });

  test('opens confirmation dialog and purges single note', async () => {
    await render(<TrashScreen />);
    await fireEvent.press(screen.getByTestId('trash-purge-101'));

    expect(screen.getByText('PURGE NOTE')).toBeOnTheScreen();
    expect(
      screen.getByText('Permanently delete "Discarded Plan"? This action cannot be undone.')
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('confirm-accept'));
    expect(hardDelete).toHaveBeenCalledWith(expect.anything(), 101);
    expect(mockReload).toHaveBeenCalled();
  });

  test('opens confirmation dialog and empties entire trash', async () => {
    await render(<TrashScreen />);
    await fireEvent.press(screen.getByTestId('empty-trash-button'));

    expect(screen.getByText('EMPTY TRASH')).toBeOnTheScreen();
    expect(
      screen.getByText('Permanently delete all notes in the trash? This action cannot be undone.')
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('confirm-accept'));
    expect(emptyTrash).toHaveBeenCalledWith(expect.anything());
    expect(mockReload).toHaveBeenCalled();
  });
});
