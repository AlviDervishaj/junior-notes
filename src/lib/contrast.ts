/**
 * WCAG 2.1 relative luminance and contrast ratio.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *
 * Exists so the palette's accessibility claims are enforced by a test rather
 * than by hand-computed numbers in a design document.
 */

const HEX = /^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/;

/** sRGB companding, per the WCAG definition. */
function channel(value8Bit: number): number {
  const s = value8Bit / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const match = HEX.exec(hex);
  if (match === null) throw new Error(`Not a 6- or 8-digit hex colour: ${hex}`);

  const rgb = match[1];
  const r = channel(parseInt(rgb.slice(0, 2), 16));
  const g = channel(parseInt(rgb.slice(2, 4), 16));
  const b = channel(parseInt(rgb.slice(4, 6), 16));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Symmetric: the lighter colour is always the numerator. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
