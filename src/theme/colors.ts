/**
 * Kraft & Ink palettes. See docs/design/note-taker-design-directions.pdf p.02
 * for light, and docs/superpowers/specs/2026-09-10-v2-polish-dark-mode-design.md
 * §5 for the Lamplight dark direction.
 *
 * These are the only colour literals in the app.
 */

export type Scheme = 'light' | 'dark';

/** Light raw colours. Unchanged from v1. */
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
  marker: '#F5E27F',
  scrim: '#22303F73',
  shadow: '#000000',
} as const;

/**
 * Lamplight: the same notebook under a warm desk lamp. Every hue is kept and
 * only the value drops, so the roles invert cleanly — light's paper cream
 * becomes dark's ink.
 */
export const PaletteDark = {
  kraft: '#6B5335',
  paper: '#1E1912',
  card: '#2A2219',
  ink: '#EDE3CE',
  brick: '#D4785A',
  dim: '#A2957C',
  rule: '#3A3125',
  textOnKraft: '#F5EDDD',
  cardBorder: '#3B3023',
  marker: '#6E5A1C',
  scrim: '#0A080599',
  shadow: '#000000',
} as const;

/** Semantic roles. Components use these, never a palette directly. */
export type ThemeColors = {
  text: { primary: string; secondary: string; onKraft: string };
  surface: { page: string; card: string; cover: string; scrim: string };
  accent: string;
  border: { hairline: string; card: string };
  marginRule: string;
  /** Marker-pen highlight behind a search match. */
  highlight: string;
  /** Drop-shadow colour for the FAB. */
  shadow: string;
};

function roles(p: typeof Palette | typeof PaletteDark): ThemeColors {
  return {
    text: { primary: p.ink, secondary: p.dim, onKraft: p.textOnKraft },
    surface: { page: p.paper, card: p.card, cover: p.kraft, scrim: p.scrim },
    accent: p.brick,
    border: { hairline: p.rule, card: p.cardBorder },
    marginRule: p.brick,
    highlight: p.marker,
    shadow: p.shadow,
  };
}

export const Schemes: Record<Scheme, ThemeColors> = {
  light: roles(Palette),
  dark: roles(PaletteDark),
};
