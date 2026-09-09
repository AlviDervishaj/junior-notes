export type NoteCategory = 'lists' | 'home' | 'ideas' | 'notes';

export type Category = { id: NoteCategory; label: string; color: string };

/** Colour-coded squares borrowed from the mid-century direction (spec §5.3). */
export const CATEGORIES: readonly Category[] = [
  { id: 'lists', label: 'Lists', color: '#D69B26' },
  { id: 'home', label: 'Home', color: '#2F6C69' },
  { id: 'ideas', label: 'Ideas', color: '#9C4A33' },
  { id: 'notes', label: 'Notes', color: '#A6AC8A' },
] as const;

export function categoryById(id: string | null): Category | null {
  if (id === null) return null;
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

export function isNoteCategory(value: unknown): value is NoteCategory {
  return typeof value === 'string' && CATEGORIES.some((c) => c.id === value);
}
