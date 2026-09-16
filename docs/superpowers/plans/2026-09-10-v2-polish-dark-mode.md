# V2 Polish — Runtime Theming and Lamplight Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the app a system-driven dark theme ("Lamplight") by moving colour resolution from module-evaluation time to render time, then verify the result on the iOS simulator.

**Architecture:** Colours become a `Schemes` record keyed by `'light' | 'dark'`. A new `makeThemedStyles(factory)` helper calls `StyleSheet.create` once per scheme at module load and returns a hook that indexes the resulting pair by `useColorScheme()`. Components keep their existing semantic role names; only delivery changes. Migration is additive — `Colors` survives as an alias until the final task removes it, so every task leaves the suite green.

**Tech Stack:** Expo SDK 57, React Native 0.86.3, React 19.2.3, expo-router 57, TypeScript 6, Jest 29 + jest-expo + @testing-library/react-native 14. React Compiler is **enabled**.

**Spec:** `docs/superpowers/specs/2026-09-10-v2-polish-dark-mode-design.md`

## Global Constraints

These apply to every task. Copied from the spec.

- **The light theme must not shift by a single hex digit.** Every light value is copied from the shipped `src/theme/colors.ts`. Task 2 adds a test that enforces this literally.
- **No colour literals outside `src/theme/`.** This is a v1 constraint the current code already violates twice (`confirm-dialog.tsx:48`, `fab.tsx:34`); this plan fixes both.
- **No SQL outside `src/db/`.** Unchanged from v1. This plan touches no SQL and requires **no data migration**.
- **All 163 existing tests must stay green** at every commit. The only test file that may be modified is `src/lib/theme-tokens.test.ts`. Any other test needing a change is a signal the refactor altered behaviour it should not have.
- **`@testing-library/react-native` v14 is fully async.** Every RNTL call must be `await`ed inside an `async` test callback. There is no `extend-expect` entry point.
- **React Compiler is on.** No `Date.now()` during render, no `setState` in an effect body where derived state will do, no reading or writing a ref during render. Violations fail `npx expo lint`.
- **Test files must never live under `src/app/`** — expo-router registers every file there as a navigable route.
- **Components calling `useSafeAreaInsets` need a `SafeAreaProvider`**, so render them through `tests/support/render.tsx`, not RNTL's bare `render`.
- **Verification floor is Expo Go on the iOS simulator.** No dev build, no CocoaPods, no EAS. Android and web are out of scope.

**Verification commands** (all three must pass before any commit):

```bash
npx jest --silent      # expect: 21+ suites, 163+ tests, 0 failures
npx tsc --noEmit       # expect: no output
npx expo lint          # expect: no output, exit 0
```

---

### Task 1: Contrast helper

Pure arithmetic, no dependencies. It exists so the palette's accessibility claims are enforced by a test rather than by hand-computed numbers in a document.

**Files:**
- Create: `src/lib/contrast.ts`
- Test: `src/lib/contrast.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `relativeLuminance(hex: string): number`, `contrastRatio(a: string, b: string): number`. Both accept 6-digit `#RRGGBB` **and** 8-digit `#RRGGBBAA` (alpha is ignored — contrast is computed on the opaque colour). Order of arguments to `contrastRatio` does not matter.

- [ ] **Step 1: Write the failing test**

Create `src/lib/contrast.test.ts`:

```ts
import { contrastRatio, relativeLuminance } from '@/lib/contrast';

describe('relativeLuminance', () => {
  test('white is 1 and black is 0', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  test('ignores an alpha suffix', () => {
    expect(relativeLuminance('#FFFFFF80')).toBeCloseTo(relativeLuminance('#FFFFFF'), 5);
  });
});

describe('contrastRatio', () => {
  test('black on white is the maximum 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  test('is symmetric in its arguments', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 2);
  });

  test('a colour against itself is 1:1', () => {
    expect(contrastRatio('#B08A57', '#B08A57')).toBeCloseTo(1, 5);
  });

  // Anchor against a value from the WCAG reference implementation.
  test('#777777 on white is about 4.48:1', () => {
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });

  test('rejects a malformed hex', () => {
    expect(() => contrastRatio('B08A57', '#FFFFFF')).toThrow(/hex/i);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest src/lib/contrast.test.ts`
Expected: FAIL — `Cannot find module '@/lib/contrast'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/contrast.ts`:

```ts
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
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx jest src/lib/contrast.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Run the full verification set**

```bash
npx jest --silent && npx tsc --noEmit && npx expo lint
```

Expected: all green, test count now 169.

- [ ] **Step 6: Commit**

```bash
git add src/lib/contrast.ts src/lib/contrast.test.ts
git commit -m "feat: add WCAG contrast helper

Pure arithmetic, so the palette's accessibility claims can be enforced
by a test rather than by hand-computed numbers in a design document."
```

---

### Task 2: Scheme tokens and the Lamplight palette

Adds the dark palette **alongside** the existing `Colors` export, which stays as an alias so nothing breaks. Task 10 removes it.

Also extends `jest.config.js`: the `logic` project currently matches only `src/lib/**` and `src/db/**`, so a test placed in `src/theme/` would **silently never run**. This is why v1 put `theme-tokens.test.ts` in `src/lib/`.

**Files:**
- Modify: `jest.config.js:20` and `jest.config.js:31-35`
- Modify: `src/theme/colors.ts` (rewrite)
- Modify: `src/theme/index.ts`
- Test: `src/theme/colors.test.ts`

**Interfaces:**
- Consumes: `contrastRatio` from Task 1.
- Produces:
  - `type Scheme = 'light' | 'dark'`
  - `type ThemeColors` — the role tree, shape given below
  - `Schemes: Record<Scheme, ThemeColors>`
  - `Palette` (light raw colours, unchanged) and `PaletteDark`
  - `Colors` — **temporary** alias for `Schemes.light`, removed in Task 10

- [ ] **Step 1: Extend the Jest projects to see `src/theme/`**

In `jest.config.js`, change the `logic` project's `testMatch` (line 20) to:

```js
      testMatch: [
        '<rootDir>/src/lib/**/*.test.ts',
        '<rootDir>/src/db/**/*.test.ts',
        '<rootDir>/src/theme/**/*.test.ts',
      ],
```

and the `native` project's `testMatch` (lines 31-35) to:

```js
      testMatch: [
        '<rootDir>/src/components/**/*.test.tsx',
        '<rootDir>/src/hooks/**/*.test.tsx',
        '<rootDir>/src/theme/**/*.test.tsx',
        '<rootDir>/tests/screens/**/*.test.tsx',
      ],
```

- [ ] **Step 2: Write the failing test**

Create `src/theme/colors.test.ts`:

```ts
import { contrastRatio } from '@/lib/contrast';
import { Schemes, type Scheme, type ThemeColors } from '@/theme/colors';

const HEX = /^#[0-9A-F]{6}([0-9A-F]{2})?$/;
const SCHEMES: Scheme[] = ['light', 'dark'];

/** Flattens the role tree to dotted paths, so key parity is checkable. */
function paths(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    paths(v, prefix === '' ? k : `${prefix}.${k}`)
  );
}

function at(colors: ThemeColors, path: string): string {
  return path.split('.').reduce<any>((acc, key) => acc[key], colors) as string;
}

describe('light scheme is byte-for-byte what v1 shipped', () => {
  // The non-negotiable constraint: this refactor must not alter the app's
  // current appearance. These are the literal values from the v1 palette.
  test.each([
    ['text.primary', '#22303F'],
    ['text.secondary', '#8A7C64'],
    ['text.onKraft', '#FBF5E9'],
    ['surface.page', '#EDE3CE'],
    ['surface.card', '#F7F0E1'],
    ['surface.cover', '#B08A57'],
    ['accent', '#9C4A33'],
    ['border.hairline', '#D6C8AC'],
    ['border.card', '#E0D4B9'],
    ['marginRule', '#9C4A33'],
    ['highlight', '#F5E27F'],
  ])('%s is %s', (path, expected) => {
    expect(at(Schemes.light, path)).toBe(expected);
  });
});

describe('scheme structure', () => {
  test('both schemes expose an identical set of roles', () => {
    expect(paths(Schemes.dark).sort()).toEqual(paths(Schemes.light).sort());
  });

  test('every value in every scheme is an uppercase hex', () => {
    for (const scheme of SCHEMES) {
      for (const path of paths(Schemes[scheme])) {
        expect(at(Schemes[scheme], path)).toMatch(HEX);
      }
    }
  });
});

describe('contrast', () => {
  // WCAG AA: 4.5:1 for body text, 3:1 for meaningful graphics.
  const TEXT_PAIRS: [string, string][] = [
    ['text.primary', 'surface.page'],
    ['text.primary', 'surface.card'],
    ['text.secondary', 'surface.page'],
    ['text.secondary', 'surface.card'],
    ['text.onKraft', 'surface.cover'],
    ['accent', 'surface.card'],
    ['accent', 'surface.page'],
  ];

  test.each(SCHEMES)('%s scheme clears 4.5:1 for text', (scheme) => {
    for (const [fg, bg] of TEXT_PAIRS) {
      const ratio = contrastRatio(at(Schemes[scheme], fg), at(Schemes[scheme], bg));
      expect({ scheme, fg, bg, ratio: Number(ratio.toFixed(2)) }).toMatchObject({
        ratio: expect.any(Number),
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  test.each(SCHEMES)('%s dot grid stays subtle, never assertive', (scheme) => {
    // The grid is texture, not information. Assert it is LOW contrast.
    const ratio = contrastRatio(
      Schemes[scheme].border.hairline,
      Schemes[scheme].surface.page
    );
    expect(ratio).toBeLessThan(2);
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npx jest src/theme/colors.test.ts`
Expected: FAIL — `Schemes` is not exported. If instead you see "no tests found", Step 1 was not applied correctly; fix it before continuing.

- [ ] **Step 4: Rewrite `src/theme/colors.ts`**

```ts
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

/**
 * @deprecated Temporary alias so the migration can proceed file by file.
 * Removed in Task 10 — use `makeThemedStyles` instead.
 */
export const Colors = Schemes.light;
```

- [ ] **Step 5: Update the barrel**

In `src/theme/index.ts`, replace the colours line with:

```ts
export { Colors, Palette, PaletteDark, Schemes } from './colors';
export type { Scheme, ThemeColors } from './colors';
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `npx jest src/theme/colors.test.ts`
Expected: PASS.

If a contrast assertion fails, **adjust the hex in `PaletteDark` until it passes — do not relax the threshold.** The test is the source of truth; the spec's hand-computed ratios are not.

- [ ] **Step 7: Run the full verification set**

```bash
npx jest --silent && npx tsc --noEmit && npx expo lint
```

`src/lib/theme-tokens.test.ts` still passes at this point: `Colors` still exists, and its `'there is no dark variant'` test checks `Colors` itself (which has no `dark` key), not the module. Task 10 retires it.

- [ ] **Step 8: Commit**

```bash
git add jest.config.js src/theme/colors.ts src/theme/colors.test.ts src/theme/index.ts
git commit -m "feat: add the Lamplight dark palette alongside light

Colors stays as an alias so the migration can proceed file by file.
Adds scrim and shadow roles, which the two existing colour literals
outside src/theme/ were standing in for.

jest.config.js needed extending: the logic project matched only
src/lib and src/db, so a test in src/theme would never have run."
```

---

### Task 3: `makeThemedStyles` and `useScheme`

**Files:**
- Create: `src/theme/themed.ts`
- Modify: `src/theme/index.ts`
- Test: `src/theme/themed.test.tsx`

**Interfaces:**
- Consumes: `Schemes`, `Scheme`, `ThemeColors` from Task 2.
- Produces:
  - `makeThemedStyles<T>(factory: (c: ThemeColors) => T): () => T` — call at module scope, use the returned hook inside the component.
  - `useScheme(): Scheme` — for the handful of places that need the scheme itself rather than a stylesheet (category colours, the dot-grid tile).

- [ ] **Step 1: Establish how to force a scheme in tests**

This is genuinely uncertain and must be settled empirically before writing the real tests. Create a throwaway probe at `src/theme/probe.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { Appearance, Text, useColorScheme } from 'react-native';

function Probe() {
  return <Text testID="scheme">{String(useColorScheme())}</Text>;
}

test('PROBE: does Appearance.setColorScheme propagate to useColorScheme?', async () => {
  Appearance.setColorScheme('dark');
  render(<Probe />);
  expect(screen.getByTestId('scheme')).toHaveTextContent('dark');
});
```

Run: `npx jest src/theme/probe.test.tsx`

- **If it passes**, use `Appearance.setColorScheme()` in all later tests — it is the public API and version-agnostic. Remember `Appearance.setColorScheme(null)` in `afterEach` to avoid leaking state between tests.
- **If it fails**, fall back to mocking the module directly:

  ```tsx
  jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
    __esModule: true,
    default: jest.fn(() => 'light'),
  }));
  ```

  and drive it with `(useColorScheme as jest.Mock).mockReturnValue('dark')`.

Delete `src/theme/probe.test.tsx` once you know the answer. **Record which mechanism worked in the commit message**, because Tasks 7 and 10 depend on it.

- [ ] **Step 2: Write the failing test**

Create `src/theme/themed.test.tsx`, using whichever mechanism Step 1 established. Written below with `Appearance`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { Appearance, Text, View } from 'react-native';

import { makeThemedStyles, useScheme } from '@/theme/themed';

afterEach(() => {
  Appearance.setColorScheme(null);
});

let factoryCalls = 0;
const useStyles = makeThemedStyles((c) => {
  factoryCalls += 1;
  return { box: { backgroundColor: c.surface.page } };
});

function Box() {
  const styles = useStyles();
  return <View testID="box" style={styles.box} />;
}

function SchemeLabel() {
  return <Text testID="scheme">{useScheme()}</Text>;
}

describe('makeThemedStyles', () => {
  test('builds each sheet exactly once, at module load', () => {
    // Two schemes, one factory call each — and rendering must not add more.
    expect(factoryCalls).toBe(2);
  });

  test('resolves light surfaces by default', async () => {
    render(<Box />);
    expect(screen.getByTestId('box')).toHaveStyle({ backgroundColor: '#EDE3CE' });
    expect(factoryCalls).toBe(2);
  });

  test('resolves dark surfaces when the system is dark', async () => {
    Appearance.setColorScheme('dark');
    render(<Box />);
    expect(screen.getByTestId('box')).toHaveStyle({ backgroundColor: '#1E1912' });
  });

  test('returns a stable, identical object across renders in one scheme', async () => {
    const first = renderStyles();
    const second = renderStyles();
    expect(first).toBe(second);
  });
});

describe('useScheme', () => {
  test('falls back to light when the system scheme is unknown', async () => {
    Appearance.setColorScheme(null);
    render(<SchemeLabel />);
    expect(screen.getByTestId('scheme')).toHaveTextContent('light');
  });

  test('reports dark when the system is dark', async () => {
    Appearance.setColorScheme('dark');
    render(<SchemeLabel />);
    expect(screen.getByTestId('scheme')).toHaveTextContent('dark');
  });
});

/** Renders once and hands back the style object the hook returned. */
function renderStyles() {
  let captured: unknown;
  function Capture() {
    captured = useStyles();
    return null;
  }
  render(<Capture />);
  return captured;
}
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npx jest src/theme/themed.test.tsx`
Expected: FAIL — `Cannot find module '@/theme/themed'`.

- [ ] **Step 4: Write the implementation**

Create `src/theme/themed.ts`:

```ts
import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { Schemes, type Scheme, type ThemeColors } from './colors';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/** The system appearance, with light as the fallback when it is unknown. */
export function useScheme(): Scheme {
  return useColorScheme() ?? 'light';
}

/**
 * Builds one StyleSheet per scheme at module load and returns a hook that
 * picks between them.
 *
 * Both sheets are created once, at import — StyleSheet.create is the thing
 * that made dark mode a refactor rather than a palette swap, because it runs
 * at module evaluation and freezes whatever colours it sees. Calling it twice
 * up front keeps that cost where it already was, and reduces switching to an
 * object lookup that allocates nothing per render.
 */
export function makeThemedStyles<T extends NamedStyles>(
  factory: (c: ThemeColors) => T
): () => T {
  const sheets: Record<Scheme, T> = {
    light: StyleSheet.create(factory(Schemes.light)),
    dark: StyleSheet.create(factory(Schemes.dark)),
  };

  return function useStyles(): T {
    return sheets[useScheme()];
  };
}
```

- [ ] **Step 5: Update the barrel**

Append to `src/theme/index.ts`:

```ts
export { makeThemedStyles, useScheme } from './themed';
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `npx jest src/theme/themed.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 7: Run the full verification set, then commit**

```bash
npx jest --silent && npx tsc --noEmit && npx expo lint
git add src/theme/themed.ts src/theme/themed.test.tsx src/theme/index.ts
git commit -m "feat: add makeThemedStyles and useScheme

Both stylesheets are built at module load and the hook is an object
lookup, so switching allocates nothing per render.

Tests force the scheme with <MECHANISM FROM STEP 1>."
```

Replace `<MECHANISM FROM STEP 1>` with what actually worked.

---

### Task 4: Per-scheme category colours

Forced by contrast: teal and brick category squares land near 2.6:1 on the dark card, under the 3:1 WCAG asks of meaningful graphics.

There are **two** call sites reading `Category.color`, not one: `category-square.tsx:19` and `note/[id].tsx:188`. Both change here, because removing `color` breaks compilation otherwise.

**Files:**
- Modify: `src/theme/categories.ts`
- Modify: `src/components/kraft/category-square.tsx`
- Modify: `src/app/note/[id].tsx:185-191`
- Modify: `src/lib/theme-tokens.test.ts` (the category colour assertion)
- Test: `src/theme/categories.test.ts`

**Interfaces:**
- Consumes: `Scheme` (Task 2), `useScheme` (Task 3), `contrastRatio` (Task 1).
- Produces: `Category = { id: NoteCategory; label: string; colors: Record<Scheme, string> }`. `categoryById` and `isNoteCategory` keep their exact signatures.

- [ ] **Step 1: Write the failing test**

Create `src/theme/categories.test.ts`:

```ts
import { contrastRatio } from '@/lib/contrast';
import { CATEGORIES, categoryById } from '@/theme/categories';
import { Schemes, type Scheme } from '@/theme/colors';

const SCHEMES: Scheme[] = ['light', 'dark'];

describe('category colours', () => {
  test('light values are unchanged from v1', () => {
    expect(CATEGORIES.map((c) => c.colors.light)).toEqual([
      '#D69B26',
      '#2F6C69',
      '#9C4A33',
      '#A6AC8A',
    ]);
  });

  test('every category defines a colour for every scheme', () => {
    for (const category of CATEGORIES) {
      for (const scheme of SCHEMES) {
        expect(category.colors[scheme]).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  // A category square is a meaningful graphic, so WCAG asks 3:1 against the
  // surface it sits on. Squares render on cards.
  test.each(SCHEMES)('%s squares clear 3:1 against the card', (scheme) => {
    for (const category of CATEGORIES) {
      const ratio = contrastRatio(category.colors[scheme], Schemes[scheme].surface.card);
      expect(ratio).toBeGreaterThanOrEqual(3);
    }
  });

  test('categoryById still resolves and still returns null for unknowns', () => {
    expect(categoryById('home')?.label).toBe('Home');
    expect(categoryById(null)).toBeNull();
    expect(categoryById('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx jest src/theme/categories.test.ts`
Expected: FAIL — `category.colors` is undefined.

- [ ] **Step 3: Reshape `src/theme/categories.ts`**

Replace the type and the constant; leave both functions untouched:

```ts
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
```

Keep `categoryById` and `isNoteCategory` exactly as they are.

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx jest src/theme/categories.test.ts`
Expected: PASS. If a 3:1 assertion fails, lighten the offending dark value until it passes.

- [ ] **Step 5: Update `category-square.tsx`**

```tsx
import { StyleSheet, View } from 'react-native';

import { categoryById, Layout, useScheme, type NoteCategory } from '@/theme';

export type CategorySquareProps = {
  category: NoteCategory | null;
  size?: number;
};

/** Colour-coded category mark. Renders nothing for an uncategorised note. */
export function CategorySquare({ category, size = 10 }: CategorySquareProps) {
  const scheme = useScheme();
  const resolved = categoryById(category);
  if (resolved === null) return null;

  return (
    <View
      testID={`category-square-${resolved.id}`}
      style={[
        styles.square,
        { width: size, height: size, backgroundColor: resolved.colors[scheme] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  square: { borderRadius: Layout.radius.chip },
});
```

Note the hook must be called **before** the early return, or it violates the rules of hooks.

- [ ] **Step 6: Update the editor's category dots**

In `src/app/note/[id].tsx`, add `useScheme` to the theme import on line 30:

```ts
import { CATEGORIES, Colors, Layout, Type, useScheme, type NoteCategory } from '@/theme';
```

Add near the other hooks in the component body (around line 45):

```ts
  const scheme = useScheme();
```

Change line 188 from `{ backgroundColor: option.color }` to:

```tsx
                    { backgroundColor: option.colors[scheme] },
```

- [ ] **Step 7: Update the v1 category assertion**

In `src/lib/theme-tokens.test.ts`, change the category colour expectation to read `.colors.light`:

```ts
    expect(CATEGORIES.map((c) => c.colors.light)).toEqual(['#D69B26', '#2F6C69', '#9C4A33', '#A6AC8A']);
```

- [ ] **Step 8: Run the full verification set, then commit**

`src/components/kraft/primitives.test.tsx:41-43` asserts `backgroundColor: '#2F6C69'` for the `home` square. It **still passes unmodified** — light `home` is unchanged, and tests render light by default. If it fails, a light value was altered and the Global Constraint is broken.

```bash
npx jest --silent && npx tsc --noEmit && npx expo lint
git add src/theme/categories.ts src/theme/categories.test.ts \
        src/components/kraft/category-square.tsx "src/app/note/[id].tsx" \
        src/lib/theme-tokens.test.ts
git commit -m "feat: give category colours a per-scheme value

Teal and brick land near 2.6:1 on the dark card, under the 3:1 WCAG
asks of meaningful graphics. Mustard and sage already clear 6:1 and
are unchanged."
```

---

### Task 5: Dark dot-grid tile, and `Paper`

**Files:**
- Modify: `scripts/make-dot-tile.mjs:14`, and the write loop at the end
- Create: `assets/images/dot-grid-dark.png`, `dot-grid-dark@2x.png`, `dot-grid-dark@3x.png` (generated)
- Modify: `src/components/kraft/paper.tsx`
- Test: `src/components/kraft/paper.test.tsx`

**Interfaces:**
- Consumes: `useScheme` (Task 3).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Parameterise the generator by variant**

In `scripts/make-dot-tile.mjs`, replace the `DOT` constant (line 14) with:

```js
// One variant per scheme. Colours must match Palette.rule / PaletteDark.rule
// in src/theme/colors.ts.
const VARIANTS = [
  { suffix: '', dot: [0xd6, 0xc8, 0xac] },
  { suffix: '-dark', dot: [0x3a, 0x31, 0x25] },
];
```

Change `makeTile(scale)` to `makeTile(scale, dot)` and, inside its pixel loop, replace `DOT[0], DOT[1], DOT[2]` with `dot[0], dot[1], dot[2]`.

Replace the final write loop with:

```js
mkdirSync('assets/images', { recursive: true });
for (const variant of VARIANTS) {
  for (const scale of DENSITIES) {
    const density = scale === 1 ? '' : `@${scale}x`;
    const path = `assets/images/dot-grid${variant.suffix}${density}.png`;
    const png = makeTile(scale, variant.dot);
    writeFileSync(path, png);
    console.log(`wrote ${path} (${PITCH * scale}x${PITCH * scale}, ${png.length} bytes)`);
  }
}
```

- [ ] **Step 2: Regenerate and confirm the light tiles are byte-identical**

```bash
git stash --keep-index --include-untracked -- assets/images 2>/dev/null || true
node scripts/make-dot-tile.mjs
git status --short assets/images
```

Expected: the three **new** `dot-grid-dark*` files are untracked additions, and the three existing light tiles show as **unmodified**. If a light tile changed, the refactor altered the light output — fix it before continuing. This is the Global Constraint in asset form.

- [ ] **Step 3: Write the failing test**

Create `src/components/kraft/paper.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { Appearance } from 'react-native';

import { Paper } from './paper';

afterEach(() => {
  Appearance.setColorScheme(null);
});

test('uses the light page colour by default', async () => {
  render(<Paper testID="paper" />);
  expect(screen.getByTestId('paper')).toHaveStyle({ backgroundColor: '#EDE3CE' });
});

test('uses the dark page colour when the system is dark', async () => {
  Appearance.setColorScheme('dark');
  render(<Paper testID="paper" />);
  expect(screen.getByTestId('paper')).toHaveStyle({ backgroundColor: '#1E1912' });
});
```

If Task 3 Step 1 established the module-mock mechanism instead of `Appearance`, use that here and in every later test.

- [ ] **Step 4: Run it and confirm it fails**

Run: `npx jest src/components/kraft/paper.test.tsx`
Expected: FAIL on the dark case — it still renders `#EDE3CE`.

- [ ] **Step 5: Update `paper.tsx`**

```tsx
import { ImageBackground, type ViewProps } from 'react-native';

import { makeThemedStyles, useScheme } from '@/theme';

// Static literals: Metro resolves require() at build time, so the source
// cannot be an interpolated filename.
const TILE = {
  light: require('@/assets/images/dot-grid.png'),
  dark: require('@/assets/images/dot-grid-dark.png'),
};

/**
 * Dot-grid paper. The grid is a repeating tile because React Native has no
 * radial-gradient and a View per dot would be thousands of nodes.
 *
 * The dot colour is baked into the PNG, so dark mode needs a second tile set
 * rather than a tint: the tile is RGBA with a feathered alpha edge, and tint
 * behaviour over partial alpha is inconsistent across platforms.
 */
export function Paper({ style, children, ...rest }: ViewProps) {
  const styles = useStyles();
  const scheme = useScheme();

  return (
    <ImageBackground
      source={TILE[scheme]}
      resizeMode="repeat"
      style={[styles.paper, style]}
      {...rest}>
      {children}
    </ImageBackground>
  );
}

const useStyles = makeThemedStyles((c) => ({
  paper: { flex: 1, backgroundColor: c.surface.page },
}));
```

- [ ] **Step 6: Run it and confirm it passes, then verify and commit**

```bash
npx jest src/components/kraft/paper.test.tsx
npx jest --silent && npx tsc --noEmit && npx expo lint
git add scripts/make-dot-tile.mjs assets/images/dot-grid-dark*.png \
        src/components/kraft/paper.tsx src/components/kraft/paper.test.tsx
git commit -m "feat: generate a dark dot-grid tile and theme Paper

tintColor was rejected: the tile is RGBA with a feathered alpha edge
and tint over partial alpha is inconsistent across platforms. Six
small PNGs are cheaper than that risk."
```

---

### Task 6: Migrate the small chrome components

Four mechanical conversions. Grouped because a reviewer would accept or reject them together.

**Files:**
- Modify: `src/components/kraft/stamp.tsx`
- Modify: `src/components/kraft/fab.tsx`
- Modify: `src/components/kraft/empty-state.tsx`
- Modify: `src/components/kraft/cover-header.tsx`

**Interfaces:**
- Consumes: `makeThemedStyles` (Task 3). Produces nothing new. All four keep their exact props.

- [ ] **Step 1: `stamp.tsx` — the sheet has no colours; only the inline one moves**

Replace the `Colors` import with `makeThemedStyles`, and swap the colour line:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { Layout, makeThemedStyles, Type } from '@/theme';
```

Inside the component, replace the `const color = …` line with:

```tsx
  const themed = useThemedColors();
  const color = tone === 'onKraft' ? themed.onKraft.color : themed.onPaper.color;
```

and add below the existing `styles`:

```tsx
/** Only the colour varies; the box geometry is scheme-independent. */
const useThemedColors = makeThemedStyles((c) => ({
  onKraft: { color: c.text.onKraft },
  onPaper: { color: c.accent },
}));
```

Leave the existing `StyleSheet.create({ stamp: … })` exactly as it is — it holds no colours.

- [ ] **Step 2: `fab.tsx` — also retires the `'#000'` literal**

Replace the import and the sheet:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native';

import { FontFamily, Layout, makeThemedStyles } from '@/theme';
```

Add `const styles = useStyles();` as the first line of the component body, and replace the bottom of the file with:

```tsx
const useStyles = makeThemedStyles((c) => ({
  fab: {
    position: 'absolute',
    right: Layout.space.lg,
    bottom: Layout.space.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  plus: {
    color: c.text.onKraft,
    fontFamily: FontFamily.chrome,
    fontSize: 26,
    lineHeight: 30,
  },
}));
```

Delete the now-unused `StyleSheet` import only if nothing else in the file uses it — here nothing does, so remove `StyleSheet` from the import.

- [ ] **Step 3: `empty-state.tsx`**

Import `makeThemedStyles` instead of `Colors`, add `const styles = useStyles();` at the top of the component, and convert:

```tsx
const useStyles = makeThemedStyles((c) => ({
  root: { alignItems: 'center', paddingTop: Layout.space.xxl * 2, gap: Layout.space.md },
  title: { color: c.text.primary },
  detail: { color: c.text.secondary, textAlign: 'center', paddingHorizontal: Layout.space.xl },
}));
```

Remove the now-unused `StyleSheet` import.

- [ ] **Step 4: `cover-header.tsx`**

Same pattern. `const styles = useStyles();` goes next to the existing `useSafeAreaInsets()` call:

```tsx
const useStyles = makeThemedStyles((c) => ({
  cover: {
    backgroundColor: c.surface.cover,
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.md,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: c.text.onKraft, marginTop: Layout.space.sm },
  subtitle: { color: c.text.onKraft, opacity: 0.78, marginTop: Layout.space.xs },
}));
```

Remove the now-unused `StyleSheet` import.

- [ ] **Step 5: Cover the two components that have no tests at all**

`primitives.test.tsx` covers **only** `Stamp` and `CoverHeader` (plus `CategorySquare`). **`Fab` and `EmptyState` have no test anywhere in the repo** — verified by `grep -rn "Fab\|EmptyState" src/components/kraft/*.test.tsx tests/screens/*.test.tsx`, which returns nothing. Converting them with no regression net is exactly how a light value slips.

Create `src/components/kraft/fab-empty-state.test.tsx`:

```tsx
import { screen } from '@testing-library/react-native';
import { Appearance } from 'react-native';

import { render } from '../../../tests/support/render';

import { EmptyState } from './empty-state';
import { Fab } from './fab';

afterEach(() => {
  Appearance.setColorScheme(null);
});

describe('Fab', () => {
  test('uses the light accent by default', async () => {
    await render(<Fab accessibilityLabel="New note" onPress={jest.fn()} />);
    expect(screen.getByTestId('fab')).toHaveStyle({ backgroundColor: '#9C4A33' });
  });

  test('uses the dark accent when the system is dark', async () => {
    Appearance.setColorScheme('dark');
    await render(<Fab accessibilityLabel="New note" onPress={jest.fn()} />);
    expect(screen.getByTestId('fab')).toHaveStyle({ backgroundColor: '#D4785A' });
  });
});

describe('EmptyState', () => {
  test('renders its title and detail', async () => {
    await render(<EmptyState stamp="blank page" title="NO ENTRIES YET" detail="Tap below." />);
    expect(screen.getByText('NO ENTRIES YET')).toBeOnTheScreen();
    expect(screen.getByText('Tap below.')).toBeOnTheScreen();
  });

  test('omits the detail when not given', async () => {
    await render(<EmptyState stamp="blank page" title="NO ENTRIES YET" />);
    expect(screen.queryByText('Tap below.')).toBeNull();
  });
});
```

Both components call `Stamp`, which does not use safe-area insets, but render through `tests/support/render` anyway for consistency with the rest of the suite.

- [ ] **Step 6: Verify and commit**

```bash
npx jest --silent && npx tsc --noEmit && npx expo lint
```

`primitives.test.tsx` must pass **unmodified** — that is the evidence the `Stamp` and `CoverHeader` conversions changed no light-mode behaviour.

```bash
git add src/components/kraft/stamp.tsx src/components/kraft/fab.tsx \
        src/components/kraft/empty-state.tsx src/components/kraft/cover-header.tsx \
        src/components/kraft/fab-empty-state.test.tsx
git commit -m "refactor: theme stamp, fab, empty state and cover header

Fab and EmptyState had no test coverage at all, so converting them
blind would have had no regression net. Adds one.

Also retires the '#000' shadow literal in fab.tsx, which was a
colour outside src/theme/."
```

---

### Task 7: Migrate `NoteCard`, the tab bar and the undo bar

**Files:**
- Modify: `src/components/kraft/note-card.tsx:57-87`
- Modify: `src/components/kraft/tab-bar.tsx:43-63`
- Modify: `src/components/kraft/undo-bar.tsx:39-55`
- Test: append to `src/components/kraft/note-card.test.tsx`

**Interfaces:**
- Consumes: `makeThemedStyles` (Task 3). All three keep their exact props.

- [ ] **Step 1: `note-card.tsx`**

Add `const styles = useStyles();` at the top of the component body. Convert the sheet:

```tsx
const useStyles = makeThemedStyles((c) => ({
  card: {
    backgroundColor: c.surface.card,
    borderRadius: Layout.radius.card,
    borderWidth: Layout.hairline,
    borderColor: c.border.card,
    marginHorizontal: Layout.space.md,
    marginTop: Layout.space.sm,
    paddingHorizontal: Layout.space.md,
    paddingVertical: Layout.space.md,
  },
  pressed: { opacity: 0.72 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.space.sm },
  title: { color: c.text.primary, flexShrink: 1 },
  excerpt: { color: c.text.secondary, marginTop: Layout.space.xs },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Layout.space.sm,
  },
  date: { color: c.text.secondary },
  match: { backgroundColor: c.highlight },
  pin: {
    backgroundColor: c.accent,
    borderRadius: Layout.radius.chip,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pinText: { color: c.text.onKraft, fontSize: 7, letterSpacing: 1.3 },
}));
```

Remove `Colors` and `StyleSheet` from the imports.

- [ ] **Step 2: `tab-bar.tsx`**

The inline colour on line 44 needs the sheet too. Add `const styles = useStyles();` beside `useSafeAreaInsets()`, change line 43-45 to:

```tsx
            <Text style={[Type.tabLabel, focused ? styles.labelOn : styles.labelOff]}>
              {label}
            </Text>
```

and convert the sheet:

```tsx
const useStyles = makeThemedStyles((c) => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: c.surface.card,
    borderTopWidth: Layout.hairline,
    borderTopColor: c.border.hairline,
    paddingTop: Layout.space.md,
  },
  tab: { flex: 1, alignItems: 'center' },
  labelOn: { color: c.accent },
  labelOff: { color: c.text.secondary },
}));
```

- [ ] **Step 3: `undo-bar.tsx` — the one component whose light design does not survive inversion**

This is **not** a mechanical conversion, so read before typing.

The undo bar is an inverted "toast": it borrows `text.primary` (ink `#22303F`) as its *background* and `text.onKraft` (cream) as its text. That works in light only because ink and cream are opposites. In dark, `text.primary` **is** the cream `#EDE3CE`, so a naive conversion yields cream text on a cream ground — invisible.

Use explicit surface roles instead of borrowing text colours. `surface.cover` is kraft in light (`#B08A57`) and deep leather in dark (`#6B5335`), and `text.onKraft` is legible on both by construction — it is the pairing the cover header already relies on.

Add `const styles = useStyles();` above the `useEffect` (hooks must precede the `if (!visible) return null` early return), and convert:

```tsx
const useStyles = makeThemedStyles((c) => ({
  bar: {
    position: 'absolute',
    left: Layout.space.md,
    right: Layout.space.md,
    bottom: Layout.space.lg,
    backgroundColor: c.surface.cover,
    borderRadius: Layout.radius.card,
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: { color: c.text.onKraft },
  action: { color: c.accent },
}));
```

This **does** change the light appearance of the undo bar — from an ink toast to a kraft one — which is the single deliberate exception to the "light must not shift" constraint. Confirm it looks right during the device pass (Task 11 Step 3, item 1). If you would rather keep light exactly as shipped, the alternative is a dedicated `surface.toast` role pair (ink in light, a lifted `#3B3023` in dark); say so and add it to `ThemeColors` rather than living with cream-on-cream.

- [ ] **Step 4: Add dark-mode regression tests for the card**

Append to `src/components/kraft/note-card.test.tsx`. The file already defines a `note(over?)` factory and a `NOW` constant at module scope, and imports `render` from `../../../tests/support/render` — reuse all three rather than introducing new ones. Add `Appearance` to the imports:

```tsx
describe('dark mode', () => {
  afterEach(() => {
    Appearance.setColorScheme(null);
  });

  test('the card resolves light surfaces by default', async () => {
    await render(<NoteCard note={note()} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByTestId('note-card-1')).toHaveStyle({ backgroundColor: '#F7F0E1' });
  });

  test('the card resolves dark surfaces when the system is dark', async () => {
    Appearance.setColorScheme('dark');
    await render(<NoteCard note={note()} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByTestId('note-card-1')).toHaveStyle({ backgroundColor: '#2A2219' });
  });
});
```

Note `await render(...)` — RNTL v14 is fully async, per the Global Constraints.

- [ ] **Step 5: Lock the undo bar's legibility with a test**

The failure mode in Step 3 was silent — cream on cream renders without error. Make it loud. Add to `src/theme/colors.test.ts`, in the `describe('contrast')` block, an entry to `TEXT_PAIRS`:

```ts
    ['text.onKraft', 'surface.cover'],
```

If it is already present from Task 2, leave it — that pair is precisely what the undo bar and the cover header both now depend on, and the assertion covers both.

- [ ] **Step 6: Verify and commit**

```bash
npx jest --silent && npx tsc --noEmit && npx expo lint
git add src/components/kraft/note-card.tsx src/components/kraft/tab-bar.tsx \
        src/components/kraft/undo-bar.tsx src/components/kraft/note-card.test.tsx
git commit -m "refactor: theme note card, tab bar and undo bar

The undo bar borrowed text.primary as a background, which inverts to
cream-on-cream in dark. It now uses surface.cover, the pairing the
cover header already relies on."
```

---

### Task 8: Migrate the dialog and error screen

**Files:**
- Modify: `src/components/kraft/confirm-dialog.tsx:45-85`
- Modify: `src/components/kraft/error-screen.tsx:32-51`

**Interfaces:**
- Consumes: `makeThemedStyles` (Task 3), the `surface.scrim` role (Task 2).

- [ ] **Step 1: `confirm-dialog.tsx`, retiring the rgba literal**

`scrim` on line 48 is currently `'rgba(34, 48, 63, 0.45)'` — a colour literal outside `src/theme/`, and the v1 constraint says there should be none. Task 2 added `surface.scrim` as 8-digit hex for exactly this.

Add `const styles = useStyles();` at the top of the component body (before the `if (!visible)` early return), and convert:

```tsx
const useStyles = makeThemedStyles((c) => ({
  scrim: {
    flex: 1,
    backgroundColor: c.surface.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.space.xl,
  },
  sheet: {
    width: '100%',
    backgroundColor: c.surface.card,
    borderRadius: Layout.radius.card,
    borderWidth: Layout.hairline,
    borderColor: c.border.card,
    padding: Layout.space.lg,
    gap: Layout.space.sm,
  },
  title: { color: c.text.primary },
  detail: { color: c.text.secondary },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Layout.space.sm,
    marginTop: Layout.space.md,
  },
  cancel: {
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
    borderWidth: Layout.hairline,
    borderColor: c.border.hairline,
    borderRadius: Layout.radius.chip,
  },
  cancelText: { color: c.text.secondary },
  accept: {
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
    backgroundColor: c.accent,
    borderRadius: Layout.radius.chip,
  },
  acceptText: { color: c.text.onKraft },
}));
```

The light scrim `#22303F73` is the same colour as `rgba(34, 48, 63, 0.45)` — `0x73` is 115, and 115/255 ≈ 0.451. The light appearance is preserved.

- [ ] **Step 2: `error-screen.tsx`**

```tsx
const useStyles = makeThemedStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.surface.page,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: Layout.space.xl,
    gap: Layout.space.md,
  },
  title: { color: c.text.primary },
  detail: { color: c.text.secondary },
  retry: {
    marginTop: Layout.space.md,
    backgroundColor: c.accent,
    borderRadius: Layout.radius.card,
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
  },
  retryText: { color: c.text.onKraft },
}));
```

- [ ] **Step 3: Verify and commit**

`error-screen.test.tsx` and `note-actions.test.tsx` must pass unmodified.

```bash
npx jest --silent && npx tsc --noEmit && npx expo lint
git add src/components/kraft/confirm-dialog.tsx src/components/kraft/error-screen.tsx
git commit -m "refactor: theme the confirm dialog and error screen

Retires the last colour literal outside src/theme/: the dialog scrim
was a hardcoded rgba(). surface.scrim carries the same light value as
8-digit hex."
```

---

### Task 9: Migrate the three screens

**Files:**
- Modify: `src/app/_layout.tsx`
- Modify: `src/app/(tabs)/search.tsx`
- Modify: `src/app/note/[id].tsx`

**Interfaces:**
- Consumes: `makeThemedStyles` (Task 3).

- [ ] **Step 1: `_layout.tsx` — both the sheet and the `Stack` `contentStyle`**

This one matters more than it looks: the `ground` view is what shows during the moment before the database opens. Left light, a dark-mode cold launch flashes cream.

Add `const styles = useStyles();` as the first line of `RootLayout`, and a `const colors = useThemeColors();` for the inline `contentStyle`. Simplest is to fold `contentStyle` into the sheet:

```tsx
const useStyles = makeThemedStyles((c) => ({
  ground: { flex: 1, backgroundColor: c.surface.page },
  stackContent: { backgroundColor: c.surface.page },
}));
```

and use `contentStyle: styles.stackContent` in `screenOptions`.

Leave `<StatusBar style="light" />` exactly as written. It sits over the kraft cover, which is dark enough for light content in both schemes (`#B08A57` and `#6B5335`). This looks like an oversight and is not one.

- [ ] **Step 2: `(tabs)/search.tsx` — including the placeholder colour**

`placeholderTextColor` on line 30 is a prop, not a style, so it needs the colour value directly. Add both:

```tsx
  const styles = useStyles();
  const scheme = useScheme();
```

and change line 30 to:

```tsx
          placeholderTextColor={Schemes[scheme].text.secondary}
```

importing `Schemes` and `useScheme` from `@/theme`. Convert the sheet:

```tsx
const useStyles = makeThemedStyles((c) => ({
  root: { flex: 1 },
  bar: {
    backgroundColor: c.surface.cover,
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.md,
  },
  input: {
    backgroundColor: c.surface.card,
    borderWidth: Layout.hairline,
    borderColor: c.border.card,
    borderRadius: Layout.radius.card,
    color: c.text.primary,
    paddingHorizontal: Layout.space.md,
    paddingVertical: Layout.space.md,
    fontSize: 13,
  },
  list: { paddingBottom: Layout.space.xxl * 2 },
}));
```

- [ ] **Step 3: `note/[id].tsx` — the largest, with two `placeholderTextColor` props**

`scheme` is already in scope from Task 4 Step 6. Add `const styles = useStyles();` alongside it. Both `placeholderTextColor` props (lines 168 and 206) become `Schemes[scheme].text.secondary`. Convert the sheet:

```tsx
const useStyles = makeThemedStyles((c) => ({
  root: { flex: 1 },
  fill: { flex: 1 },
  bar: {
    backgroundColor: c.surface.cover,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.md,
  },
  barText: { color: c.text.onKraft },
  page: {
    flexGrow: 1,
    padding: Layout.space.lg,
    paddingBottom: Layout.space.xxl * 2,
  },
  title: { color: c.text.primary, paddingVertical: Layout.space.xs },
  meta: { color: c.text.secondary, marginBottom: Layout.space.lg },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.space.md,
    marginBottom: Layout.space.lg,
  },
  action: { color: c.text.secondary },
  destructive: { color: c.accent, marginLeft: 'auto' },
  categoryDot: { width: 14, height: 14, borderRadius: Layout.radius.chip, opacity: 0.45 },
  categoryDotActive: { opacity: 1 },
  bodyWrap: { flex: 1, flexDirection: 'row', gap: Layout.space.md },
  marginRule: { width: 1, backgroundColor: c.marginRule, opacity: 0.55 },
  body: { color: c.text.primary, flex: 1 },
}));
```

`categoryDot` at `opacity: 0.45` may be too dim against a dark page. Do **not** change it here — note it and check it during the device pass (Task 11).

- [ ] **Step 4: Verify and commit**

All three screen tests in `tests/screens/` must pass unmodified.

```bash
npx jest --silent && npx tsc --noEmit && npx expo lint
git add src/app/_layout.tsx "src/app/(tabs)/search.tsx" "src/app/note/[id].tsx"
git commit -m "refactor: theme the root layout, search and editor screens

The root ground matters most: it is what shows before the database
opens, so left light it would flash cream on a dark cold launch."
```

---

### Task 10: Remove `Colors`, retire the stale guard, and configure native appearance

The task that makes a missed component a compile error rather than a silent light-mode island.

**Files:**
- Modify: `src/theme/colors.ts` (remove the alias)
- Modify: `src/theme/index.ts`
- Modify: `src/lib/theme-tokens.test.ts`
- Modify: `app.json`

- [ ] **Step 1: Prove nothing still imports `Colors`**

```bash
grep -rn "Colors" src --include='*.ts' --include='*.tsx' | grep -v 'ThemeColors'
```

Expected: only `src/theme/colors.ts`, `src/theme/index.ts` and `src/lib/theme-tokens.test.ts`. Any component still listed was missed in Tasks 5–9 — go back and convert it.

- [ ] **Step 2: Delete the alias**

Remove the `@deprecated export const Colors = Schemes.light;` block from `src/theme/colors.ts`, and drop `Colors` from the `src/theme/index.ts` export list.

- [ ] **Step 3: Rewrite the stale guard in `src/lib/theme-tokens.test.ts`**

Delete the `'there is no dark variant'` test (line 38) — it asserts the opposite of what now ships. Replace the whole `describe('semantic roles')` block with:

```ts
describe('semantic roles', () => {
  test('light roles resolve to values present in the light palette', () => {
    const known = new Set<string>(Object.values(Palette));
    const roles = [
      Schemes.light.text.primary, Schemes.light.text.secondary, Schemes.light.text.onKraft,
      Schemes.light.surface.page, Schemes.light.surface.card, Schemes.light.surface.cover,
      Schemes.light.accent, Schemes.light.border.hairline, Schemes.light.highlight,
    ];
    for (const role of roles) expect(known.has(role)).toBe(true);
  });

  test('dark roles resolve to values present in the dark palette', () => {
    const known = new Set<string>(Object.values(PaletteDark));
    const roles = [
      Schemes.dark.text.primary, Schemes.dark.text.secondary, Schemes.dark.text.onKraft,
      Schemes.dark.surface.page, Schemes.dark.surface.card, Schemes.dark.surface.cover,
      Schemes.dark.accent, Schemes.dark.border.hairline, Schemes.dark.highlight,
    ];
    for (const role of roles) expect(known.has(role)).toBe(true);
  });
});
```

Update the file's imports to pull `Schemes`, `Palette` and `PaletteDark` instead of `Colors`.

- [ ] **Step 4: Turn on automatic appearance in `app.json`**

Change `"userInterfaceStyle": "light"` to `"automatic"`, and extend the splash plugin entry to:

```json
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#B08A57",
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 180,
          "dark": {
            "backgroundColor": "#1E1912",
            "image": "./assets/images/splash-icon.png"
          }
        }
      ],
```

Leave `android.adaptiveIcon.backgroundColor` alone — an app icon should not follow the system theme. `expo-system-ui` is already a dependency at `~57.0.3`, which is what Android needs for `userInterfaceStyle` to be honoured; nothing to install.

- [ ] **Step 5: Verify and commit**

```bash
npx jest --silent && npx tsc --noEmit && npx expo lint
```

`tsc` passing here is the real proof of coverage: with `Colors` gone, any unconverted component fails to compile.

```bash
git add src/theme/colors.ts src/theme/index.ts src/lib/theme-tokens.test.ts app.json
git commit -m "feat: remove the Colors alias and enable automatic appearance

With the alias gone, a component that missed the migration is a
compile error rather than a silent light-mode island.

Retires the 'there is no dark variant' guard, which now asserts the
opposite of what ships."
```

---

### Task 11: Device pass on the iOS simulator

The app has never run on a simulator or hardware. Every bug in the v1 plan's "fixed during execution" list was found by running it, not by testing it.

**Triage rule:** dark-mode and theming defects are fixed in this task. Anything else is written down in the findings section and filed — **not** fixed inline. Scope creep during a verification pass is how a two-day change becomes a two-week one.

**Files:**
- Modify: `docs/superpowers/plans/2026-09-10-v2-polish-dark-mode.md` (append findings)

- [ ] **Step 1: Boot the app**

```bash
npx expo start --ios
```

If Metro fails to resolve `dot-grid-dark.png`, clear the cache: `npx expo start --ios --clear`.

- [ ] **Step 2: Walk every screen in light**

Toggle the simulator to light via **Features → Appearance → Light** (or `xcrun simctl ui booted appearance light`). Check: notes list, editor, search, and the empty states. Compare against the v1 appearance — **nothing may have changed**. This is the visual counterpart to the light-values test.

- [ ] **Step 3: Walk every screen in dark**

`xcrun simctl ui booted appearance dark`. Check each screen, and specifically these five, which the plan flagged as at-risk:

1. **Undo bar** — delete a note and confirm the toast text is legible against its ground (Task 7 Step 5).
2. **Editor category dots** — `opacity: 0.45` when inactive may be too dim on a dark page (Task 9 Step 3). If so, raise the inactive opacity and note the change.
3. **Dot grid** — visible as texture but not assertive. If the dark tile did not load you will see a flat page with no dots at all.
4. **Search placeholder** — `placeholderTextColor` is a prop, not a style, and is the easiest thing to have missed.
5. **Confirm dialog scrim** — the modal ground behind the sheet.

- [ ] **Step 4: Toggle appearance mid-session**

With the app open on the notes list, switch the simulator appearance. Every surface must repaint without a reload. Repeat with the editor open and with the confirm dialog visible — a modal is the most likely thing to keep a stale sheet.

- [ ] **Step 5: Cold launch in dark**

Kill the app, set the simulator to dark, relaunch. Watch for a cream flash between the splash dismissing and the first screen painting — that is the `ground` view in `_layout.tsx`, and a flash means Task 9 Step 1 did not take.

- [ ] **Step 6: Confirm the refactor changed no behaviour**

Exercise: create a note, autosave (`SAVING…` → `SAVED ✓`), pin, set and clear a category, search with a match and with no match, delete, undo, and open the editor then back out without typing (which must leave no empty row).

- [ ] **Step 7: Record findings and commit**

Append a `## Device pass findings` section to this plan file listing every defect found, each marked **fixed here** (theming) or **filed** (everything else). Record "no defects found" explicitly if that is the outcome — a silent findings section is indistinguishable from a skipped pass.

```bash
npx jest --silent && npx tsc --noEmit && npx expo lint
git add -A
git commit -m "test: device pass on the iOS simulator

First time the app has run outside of Jest. Findings recorded in the
plan; non-theming defects filed rather than fixed."
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task(s) |
|---|---|
| §3 in-scope 1 — runtime theming | 3, 6, 7, 8, 9, 10 |
| §3 in-scope 2 — Lamplight palette | 2 |
| §3 in-scope 3 — per-scheme categories | 4 |
| §3 in-scope 4 — dark dot-grid tile | 5 |
| §3 in-scope 5 — native configuration | 10 |
| §3 in-scope 6 — device pass | 11 |
| §3 — light theme must not shift | 2 (test), 5 Step 2 (assets), 6/8/9 (unmodified tests), 11 Step 2 (by eye) |
| §4.1 — token shape | 2 |
| §4.2 — `makeThemedStyles` | 3 |
| §4.3 — all 14 files | 4 (category-square), 5 (paper), 6 (×4), 7 (×3), 8 (×2), 9 (×3) = 14 |
| §5 — palette values | 2 |
| §6 — contrast, incl. category reshape | 1, 2, 4 |
| §7 — dot-grid tile, static requires | 5 |
| §8 — app.json, splash dark, StatusBar left alone | 10 Step 4, 9 Step 1 |
| §9 items 1–6 — tests | 2 (1,2,3), 1+2+4 (4), 3 (5), 5/7 (6) |
| §10 — device pass and triage rule | 11 |
| §11 — risk: a component is missed | 10 Step 1 (grep) + 10 Step 5 (`tsc` as proof) |
| §12 — deferred | not implemented, by design |

No spec requirement is unassigned.

**Type consistency:** `ThemeColors` (Task 2) is consumed unchanged by `makeThemedStyles` (Task 3) and every component task. `Scheme` is used identically in Tasks 2, 3, 4 and 9. `Category.colors: Record<Scheme, string>` (Task 4) is read as `colors[scheme]` in both call sites. `useScheme()` returns `Scheme`, matching its use as an index in Tasks 4, 5 and 9. `contrastRatio(a, b)` keeps its two-argument shape in Tasks 1, 2 and 4.

**Two things deliberately left open, with a decision procedure rather than a guess:**

1. **How to force a colour scheme in tests** (Task 3 Step 1). `Appearance.setColorScheme()` is the public API and ought to work, but whether it propagates to `useColorScheme` under jest-expo is not something to assert from memory. The task probes it first and records the answer for later tasks.
2. **Whether the exact dark hexes clear the thresholds.** The spec's ratios are hand-computed. Tasks 2 and 4 both instruct: if an assertion fails, adjust the hex, never the threshold.

**Risks the plan carries that the spec did not name:**

- **Task 7's undo bar** is the one component whose light design (`text.primary` as a background) does not survive inversion. Caught while reading the source for this plan, not during design. Step 5 fixes it.
- **Task 2's Jest config change** is load-bearing and easy to skip. Without it a test placed in `src/theme/` reports "no tests found" rather than failing, which is the quiet kind of wrong. Step 3 tells the engineer to check for exactly that symptom.

---

## Execution Handoff

Plan complete. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.
