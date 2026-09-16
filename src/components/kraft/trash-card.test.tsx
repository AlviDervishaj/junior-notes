import { fireEvent, screen } from '@testing-library/react-native';

import type { DeletedNote } from '@/db/types';
import { render } from '../../../tests/support/render';

import { TrashCard } from './trash-card';

const NOW = 1_757_000_000_000;

const makeNote = (over: Partial<DeletedNote> = {}): DeletedNote => ({
  id: 42,
  title: 'Deleted Thought',
  body: 'Some old ideas here',
  category: 'ideas',
  pinned: false,
  createdAt: NOW - 100_000,
  updatedAt: NOW - 50_000,
  deletedAt: NOW - 20_000,
  ...over,
});

describe('TrashCard', () => {
  const onRestore = jest.fn();
  const onPurge = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders title, excerpt, category badge, and days remaining', async () => {
    const note = makeNote();
    await render(
      <TrashCard note={note} now={NOW} onRestore={onRestore} onPurge={onPurge} />
    );

    expect(screen.getByText('Deleted Thought')).toBeOnTheScreen();
    expect(screen.getByText('Some old ideas here')).toBeOnTheScreen();
    expect(screen.getByText('IDEAS')).toBeOnTheScreen();
    expect(screen.getByText('30 DAYS LEFT')).toBeOnTheScreen();
  });

  test('renders Untitled when title is empty', async () => {
    const note = makeNote({ title: '   ' });
    await render(
      <TrashCard note={note} now={NOW} onRestore={onRestore} onPurge={onPurge} />
    );

    expect(screen.getByText('Untitled')).toBeOnTheScreen();
  });

  test('calls onRestore when restore button is pressed', async () => {
    const note = makeNote();
    await render(
      <TrashCard note={note} now={NOW} onRestore={onRestore} onPurge={onPurge} />
    );

    await fireEvent.press(screen.getByTestId('trash-restore-42'));
    expect(onRestore).toHaveBeenCalledWith(42);
    expect(onPurge).not.toHaveBeenCalled();
  });

  test('calls onPurge when purge button is pressed', async () => {
    const note = makeNote();
    await render(
      <TrashCard note={note} now={NOW} onRestore={onRestore} onPurge={onPurge} />
    );

    await fireEvent.press(screen.getByTestId('trash-purge-42'));
    expect(onPurge).toHaveBeenCalledWith(42);
    expect(onRestore).not.toHaveBeenCalled();
  });
});
