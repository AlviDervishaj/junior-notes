/**
 * Kraft & Ink palette. See docs/design/note-taker-design-directions.pdf p.02.
 * These are the only colour literals in the app.
 */
export const Palette = {
  kraft: '#B08A57',
  paper: '#EDE3CE',
  card: '#F7F0E1',
  ink: '#22303F',
  brick: '#9C4A33',
  dim: '#8A7C64',
  rule: '#D6C8AC',
  textOnKraft: '#FBF5E9',
  cardBorder: '#E0D4B9',
} as const;

/** Semantic roles. Components use these, never Palette directly. */
export const Colors = {
  text: {
    primary: Palette.ink,
    secondary: Palette.dim,
    onKraft: Palette.textOnKraft,
  },
  surface: {
    page: Palette.paper,
    card: Palette.card,
    cover: Palette.kraft,
  },
  accent: Palette.brick,
  border: {
    hairline: Palette.rule,
    card: Palette.cardBorder,
  },
  marginRule: Palette.brick,
} as const;
