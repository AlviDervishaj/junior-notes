import { Share } from 'react-native';

import { haptics } from './haptics';

export type ExportFormat = 'markdown' | 'text';

export type FormatNoteOptions = {
  categoryLabel?: string | null;
};

/**
 * Formats note title and body into clean Markdown or Plain Text.
 */
export function formatNote(
  title: string,
  body: string,
  format: ExportFormat = 'markdown',
  options?: FormatNoteOptions
): string {
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();

  if (format === 'markdown') {
    const parts: string[] = [];

    if (trimmedTitle) {
      parts.push(`# ${trimmedTitle}`);
    }

    if (options?.categoryLabel) {
      parts.push(`*Category: ${options.categoryLabel}*`);
    }

    if (trimmedBody) {
      parts.push(trimmedBody);
    }

    return parts.join('\n\n');
  }

  // Plain text format
  const parts: string[] = [];
  if (trimmedTitle) {
    parts.push(trimmedTitle);
  }
  if (options?.categoryLabel) {
    parts.push(`[${options.categoryLabel.toUpperCase()}]`);
  }
  if (trimmedBody) {
    parts.push(trimmedBody);
  }

  return parts.join('\n\n');
}

/**
 * Triggers native iOS share sheet with formatted note content.
 */
export async function shareNoteContent({
  title,
  body,
  format = 'markdown',
  categoryLabel,
}: {
  title: string;
  body: string;
  format?: ExportFormat;
  categoryLabel?: string | null;
}): Promise<boolean> {
  const message = formatNote(title, body, format, { categoryLabel });
  if (!message.trim()) {
    haptics.warning();
    return false;
  }

  try {
    const result = await Share.share(
      {
        title: title.trim() || 'Note',
        message,
      },
      {
        subject: title.trim() || 'Note',
        dialogTitle: `Share Note (${format.toUpperCase()})`,
      }
    );

    if (result.action === Share.sharedAction) {
      haptics.success();
      return true;
    }
    return false;
  } catch {
    haptics.error();
    return false;
  }
}
