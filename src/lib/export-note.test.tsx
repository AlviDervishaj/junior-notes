import { Share } from 'react-native';

import { formatNote, shareNoteContent } from './export-note';
import { haptics } from './haptics';

jest.mock('./haptics', () => ({
  haptics: {
    selection: jest.fn(),
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

describe('export-note formatNote', () => {
  test('formats markdown with title, category, and body', () => {
    const result = formatNote('Project Ideas', '1. Build notes app\n2. Add haptics', 'markdown', {
      categoryLabel: 'Ideas',
    });
    expect(result).toBe('# Project Ideas\n\n*Category: Ideas*\n\n1. Build notes app\n2. Add haptics');
  });

  test('formats markdown without title or category', () => {
    const result = formatNote('', 'Just some body text', 'markdown');
    expect(result).toBe('Just some body text');
  });

  test('formats plain text with title, category, and body', () => {
    const result = formatNote('Groceries', 'Apples\nMilk', 'text', {
      categoryLabel: 'Lists',
    });
    expect(result).toBe('Groceries\n\n[LISTS]\n\nApples\nMilk');
  });

  test('formats plain text without category', () => {
    const result = formatNote('Quick thought', 'Remember to call Alice', 'text');
    expect(result).toBe('Quick thought\n\nRemember to call Alice');
  });

  test('handles empty title and body gracefully', () => {
    expect(formatNote('', '', 'markdown')).toBe('');
    expect(formatNote('', '', 'text')).toBe('');
  });
});

describe('export-note shareNoteContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not trigger Share if note is empty and fires warning haptic', async () => {
    const spy = jest.spyOn(Share, 'share');
    const shared = await shareNoteContent({ title: '', body: '' });
    expect(shared).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(haptics.warning).toHaveBeenCalled();
  });

  test('calls Share.share with formatted markdown and fires success on share', async () => {
    jest.spyOn(Share, 'share').mockResolvedValueOnce({
      action: Share.sharedAction,
      activityType: 'com.apple.UIKit.activity.CopyToPasteboard',
    });

    const shared = await shareNoteContent({
      title: 'Meeting Notes',
      body: 'Discuss Q3 roadmap',
      format: 'markdown',
      categoryLabel: 'Notes',
    });

    expect(shared).toBe(true);
    expect(Share.share).toHaveBeenCalledWith(
      {
        title: 'Meeting Notes',
        message: '# Meeting Notes\n\n*Category: Notes*\n\nDiscuss Q3 roadmap',
      },
      expect.objectContaining({
        subject: 'Meeting Notes',
      })
    );
    expect(haptics.success).toHaveBeenCalled();
  });

  test('returns false if user dismisses share sheet', async () => {
    jest.spyOn(Share, 'share').mockResolvedValueOnce({
      action: Share.dismissedAction,
    });

    const shared = await shareNoteContent({
      title: 'Draft',
      body: 'Some draft text',
    });

    expect(shared).toBe(false);
    expect(haptics.success).not.toHaveBeenCalled();
  });

  test('handles Share errors gracefully with error haptic', async () => {
    jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('Share failure'));

    const shared = await shareNoteContent({
      title: 'Draft',
      body: 'Some draft text',
    });

    expect(shared).toBe(false);
    expect(haptics.error).toHaveBeenCalled();
  });
});
