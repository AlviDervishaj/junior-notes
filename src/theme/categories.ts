import type { Scheme } from './colors';

export type NoteCategory = 'lists' | 'home' | 'ideas' | 'notes';

export type Category = {
  id: NoteCategory;
  label: string;
  colors: Record<Scheme, string>;
};

/**
 * Colour-coded squares borrowed from the mid-century direction (v1 spec §5.3).
 *
 * Teal and brick are lightened in dark: at their light values they land near
 * 2.6:1 on the dark card, under the 3:1 WCAG asks of meaningful graphics.
 * Dark brick equals the dark accent, which is not a collision — the two are
 * already the same colour in light.
 */
export const CATEGORIES: readonly Category[] = [
  { id: 'lists', label: 'Lists', colors: { light: '#D69B26', dark: '#D69B26' } },
  { id: 'home', label: 'Home', colors: { light: '#2F6C69', dark: '#3E8F8B' } },
  { id: 'ideas', label: 'Ideas', colors: { light: '#9C4A33', dark: '#D4785A' } },
  { id: 'notes', label: 'Notes', colors: { light: '#A6AC8A', dark: '#A6AC8A' } },
] as const;

export function categoryById(id: string | null): Category | null {
  if (id === null) return null;
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

export function isNoteCategory(value: unknown): value is NoteCategory {
  return typeof value === 'string' && CATEGORIES.some((c) => c.id === value);
}
