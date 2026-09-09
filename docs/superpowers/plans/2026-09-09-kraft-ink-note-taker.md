# Kraft & Ink Note Taker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first note-taking app on the existing Expo SDK 57 template, styled in the approved Kraft & Ink visual direction.

**Architecture:** Four layers with one-way dependencies — `theme/` (pure design tokens) → `db/` (SQLite behind a narrow interface, no React) → `hooks/` (React state over `db/`) → `components/` + `app/` (presentation, no SQL and no date maths). The DB layer takes an injected `SqlDb` interface so production uses `expo-sqlite` while tests use Node's built-in `node:sqlite`.

**Tech Stack:** Expo SDK 57 (`~57.0.21`), React 19.2.3, React Native 0.86.3, expo-router 57 (typed routes), expo-sqlite, expo-font, react-native-reanimated 4.5.1, jest-expo 57, `@testing-library/react-native` 14.

**Spec:** `docs/superpowers/specs/2026-09-09-note-taker-design.md`

## Global Constraints

- **Read the versioned docs before writing code:** https://docs.expo.dev/versions/v57.0.0/ — per `AGENTS.md`. Expo's API changed; do not write from memory.
- **No SQL outside `src/db/`.** Screens and components never contain query strings.
- **No colour literals outside `src/theme/`.** Every colour is a semantic token.
- **Palette is fixed** (spec §5.1): kraft `#B08A57`, paper `#EDE3CE`, card `#F7F0E1`, ink `#22303F`, brick `#9C4A33`, dim `#8A7C64`, rule `#D6C8AC`, textOnKraft `#FBF5E9`.
- **Category colours are fixed** (spec §5.3): lists `#D69B26`, home `#2F6C69`, ideas `#9C4A33`, notes `#A6AC8A`.
- **Fonts:** Jost (chrome, weights 400/500) and Courier Prime (body, weights 400/700). No other faces.
- **No dark mode.** Single palette. Do not add a `dark` key anywhere.
- **Do not use** `expo-glass-effect` or `expo-symbols` — blur and SF Symbols break the aesthetic (spec §5.4).
- **No border radius above 4px**, except the circular FAB and category pills.
- **Timestamps are epoch milliseconds** (integers), never ISO strings.
- **All SQL parameters are bound**, never interpolated into the query string.
- **Commit after every task.** Conventional commit prefixes (`feat:`, `test:`, `chore:`, `refactor:`).
- **`@testing-library/react-native` v14 is fully async** (it renders under React 19 concurrent mode). `render`, `renderHook`, `rerender`, `unmount`, `fireEvent.*`, `act` and `waitFor` all return promises and **must be awaited**; every test callback touching them is `async`. Forgetting the `await` on `render` fails with the misleading message `` `render` function has not been called ``, because `screen` is never populated. `renderHook` resolves to `{ result, rerender, unmount }` where `result` is a ref — read `result.current`.
- **v14 does not auto-register its matchers.** `tests/setup-native.ts` must call `expect.extend(matchers)`; there is no `@testing-library/react-native/extend-expect` entry point in v14.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `jest.config.js` | Two jest projects: `logic` (node env) and `native` (jest-expo) |
| `tests/support/test-db.ts` | `node:sqlite` adapter implementing `SqlDb` for tests |
| `tests/setup-native.ts` | jest-expo setup for the native project |
| `scripts/make-dot-tile.mjs` | Generates the dot-grid PNG tile asset |
| `src/theme/colors.ts` | Raw palette + semantic roles |
| `src/theme/layout.ts` | Spacing, radii, hairline widths |
| `src/theme/categories.ts` | The four categories + lookup helper |
| `src/theme/typography.ts` | Font family constants + text styles |
| `src/theme/index.ts` | Barrel re-export |
| `src/lib/format-date.ts` | Relative date formatting + word count |
| `src/lib/like.ts` | `LIKE` pattern escaping |
| `src/lib/highlight.ts` | Split text into matched/unmatched segments |
| `src/lib/autosave.ts` | Pure debounced autosave state machine |
| `src/db/types.ts` | `Note`, `NoteRow`, `SqlDb` interface, `rowToNote` |
| `src/db/migrations.ts` | Versioned schema via `PRAGMA user_version` |
| `src/db/notes.ts` | All note queries |
| `src/hooks/use-app-fonts.ts` | Font loading with fallback on failure |
| `src/hooks/use-notes.ts` | List + search subscription |
| `src/hooks/use-note.ts` | Single note load |
| `src/hooks/use-autosave.ts` | React wrapper over `lib/autosave.ts` |
| `src/components/kraft/paper.tsx` | Dot-grid background |
| `src/components/kraft/stamp.tsx` | Rubber-stamp label |
| `src/components/kraft/cover-header.tsx` | Kraft header block |
| `src/components/kraft/category-square.tsx` | Colour-coded category mark |
| `src/components/kraft/note-card.tsx` | List row |
| `src/components/kraft/fab.tsx` | Brick circular action button |
| `src/components/kraft/tab-bar.tsx` | Custom kraft tab bar |
| `src/components/kraft/empty-state.tsx` | Stamped empty states |
| `src/components/kraft/confirm-dialog.tsx` | Delete confirmation |
| `src/components/kraft/undo-bar.tsx` | Transient undo affordance |
| `src/components/kraft/error-screen.tsx` | Blocking migration-failure screen |
| `src/app/(tabs)/_layout.tsx` | Tabs with the custom tab bar |
| `src/app/(tabs)/index.tsx` | Notes list |
| `src/app/(tabs)/search.tsx` | Search |
| `src/app/note/[id].tsx` | Editor |
| `assets/images/dot-grid.png` | 11×11 dot tile (generated) |

**Modified:**

| Path | Change |
|---|---|
| `package.json` | Add deps + `test` script |
| `src/app/_layout.tsx` | Font loading + `SQLiteProvider` + migration error handling |
| `src/constants/theme.ts` | Remove `Colors` light/dark (superseded by `src/theme/`) |

**Deleted:**

| Path | Reason |
|---|---|
| `src/components/app-tabs.tsx` | `NativeTabs` cannot be styled to the design (spec §4.1) |
| `src/components/app-tabs.web.tsx` | Same |
| `src/app/index.tsx` | Replaced by `(tabs)/index.tsx` |
| `src/app/explore.tsx` | Template demo screen |
| `src/components/hint-row.tsx`, `web-badge.tsx`, `animated-icon*`, `ui/collapsible.tsx`, `external-link.tsx` | Template demo components (Task 18 verifies nothing imports them) |

---

### Task 1: Test harness

Two jest projects because the DB and pure-logic tests need a real Node environment (for `node:sqlite`), while component tests need jest-expo's React Native environment.

**Files:**
- Create: `jest.config.js`, `tests/setup-native.ts`, `src/lib/smoke.test.ts`, `src/components/kraft/smoke.test.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` runs both projects. Test file conventions: `src/{lib,db}/**/*.test.ts` → logic project; `src/{components,hooks,app}/**/*.test.tsx` → native project.

- [ ] **Step 1: Install dev dependencies**

```bash
npx expo install --dev jest-expo jest @testing-library/react-native @types/jest
```

- [ ] **Step 2: Create `jest.config.js`**

```js
/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'logic',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/lib/**/*.test.ts', '<rootDir>/src/db/**/*.test.ts'],
      transform: {
        '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
      },
      moduleNameMapper: {
        '^@/assets/(.*)$': '<rootDir>/assets/$1',
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'native',
      preset: 'jest-expo',
      testMatch: [
        '<rootDir>/src/components/**/*.test.tsx',
        '<rootDir>/src/hooks/**/*.test.tsx',
        '<rootDir>/src/app/**/*.test.tsx',
      ],
      moduleNameMapper: {
        '^@/assets/(.*)$': '<rootDir>/assets/$1',
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup-native.ts'],
    },
  ],
};
```

Note the mapper order: `^@/assets/` must come before `^@/` or the generic rule swallows it.

- [ ] **Step 3: Create `tests/setup-native.ts`**

```ts
import * as matchers from '@testing-library/react-native/matchers';

// RNTL v14 does not auto-register its matchers, so `toBeOnTheScreen` and
// friends have to be extended onto expect explicitly.
expect.extend(matchers);
```

- [ ] **Step 4: Add the test script to `package.json`**

Add to `"scripts"`:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 4b: Make the test globals visible to TypeScript**

`expo/tsconfig.base` sets no `types` field, and auto-inclusion of `@types/*` does
not pick up jest here — `npx tsc --noEmit` fails with `Cannot find name 'test'`.
Add to `compilerOptions` in `tsconfig.json`:

```json
"types": ["jest", "node", "react"],
```

`node` is required for `node:sqlite` in the logic tests. Install it explicitly
rather than relying on it being present transitively:

```bash
npx expo install --dev @types/node
```

- [ ] **Step 4c: Install eslint**

`npx expo lint` fails with `Cannot find module 'eslint'` on a fresh clone; the
template ships the script but not the dependency. Running `npx expo lint` once
installs `eslint` and `eslint-config-expo` and writes them to `package.json`.

**Known baseline failure:** lint then reports one pre-existing error in
`src/hooks/use-color-scheme.web.ts` (`react-hooks/set-state-in-effect`). This is
template code, not ours. It is resolved in Task 19, which deletes that file along
with the rest of the light/dark theming. Until then, `npx expo lint` exits 1 for
reasons unrelated to this work — do not chase it.

- [ ] **Step 5: Write one smoke test per project**

`src/lib/smoke.test.ts`:

```ts
import { DatabaseSync } from 'node:sqlite';

test('logic project runs in a real node environment', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE t (a INTEGER)');
  db.prepare('INSERT INTO t VALUES (?)').run(1);
  expect(db.prepare('SELECT a FROM t').all()).toEqual([{ a: 1 }]);
});
```

`src/components/kraft/smoke.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

test('native project renders react native components', async () => {
  await render(<Text>hello</Text>);
  expect(screen.getByText('hello')).toBeOnTheScreen();
});
```

- [ ] **Step 6: Run both projects**

Run: `npm test`
Expected: PASS — 2 tests across 2 projects. If the `logic` project fails to transform TypeScript, confirm `babel-preset-expo` resolves (`node -e "require.resolve('babel-preset-expo')"`); it ships with `expo`.

- [ ] **Step 7: Commit**

```bash
git add jest.config.js tests/setup-native.ts src/lib/smoke.test.ts src/components/kraft/smoke.test.tsx package.json package-lock.json bun.lock
git commit -m "chore: add jest harness with logic and native projects"
```

---

### Task 2: Theme tokens — colours, layout, categories

**Files:**
- Create: `src/theme/colors.ts`, `src/theme/layout.ts`, `src/theme/categories.ts`, `src/theme/index.ts`, `src/lib/theme-tokens.test.ts`
- Test: `src/lib/theme-tokens.test.ts` (lives in `lib/` so it runs in the fast logic project)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `Palette` — raw colours: `kraft, paper, card, ink, brick, dim, rule, textOnKraft, marker, marginRule`
  - `Colors` — semantic roles: `Colors.text.{primary,secondary,onKraft}`, `Colors.surface.{page,card,cover}`, `Colors.accent`, `Colors.border.hairline`, `Colors.marginRule`
  - `Layout` — `space` (2/4/8/12/16/24/32), `radius.{card,chip,stamp}`, `hairline`, `dotSpacing`
  - `CATEGORIES: readonly Category[]`, `Category = { id: NoteCategory; label: string; color: string }`, `categoryById(id: string | null): Category | null`

- [ ] **Step 1: Write the failing test**

`src/lib/theme-tokens.test.ts`:

```ts
import { CATEGORIES, categoryById } from '@/theme/categories';
import { Colors, Palette } from '@/theme/colors';
import { Layout } from '@/theme/layout';

const HEX = /^#[0-9A-F]{6}$/;

describe('palette', () => {
  test('matches the approved Kraft & Ink values', () => {
    expect(Palette.kraft).toBe('#B08A57');
    expect(Palette.paper).toBe('#EDE3CE');
    expect(Palette.card).toBe('#F7F0E1');
    expect(Palette.ink).toBe('#22303F');
    expect(Palette.brick).toBe('#9C4A33');
    expect(Palette.dim).toBe('#8A7C64');
    expect(Palette.rule).toBe('#D6C8AC');
  });

  test('every value is an uppercase 6-digit hex', () => {
    for (const value of Object.values(Palette)) expect(value).toMatch(HEX);
  });
});

describe('semantic roles', () => {
  test('resolve to values present in the palette', () => {
    const known = new Set<string>(Object.values(Palette));
    const roles = [
      Colors.text.primary, Colors.text.secondary, Colors.text.onKraft,
      Colors.surface.page, Colors.surface.card, Colors.surface.cover,
      Colors.accent, Colors.border.hairline,
    ];
    for (const role of roles) expect(known.has(role)).toBe(true);
  });

  test('there is no dark variant', () => {
    expect(Colors).not.toHaveProperty('dark');
  });
});

describe('categories', () => {
  test('are the four approved categories with the approved colours', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual(['lists', 'home', 'ideas', 'notes']);
    expect(CATEGORIES.map((c) => c.color)).toEqual(['#D69B26', '#2F6C69', '#9C4A33', '#A6AC8A']);
  });

  test('ids are unique', () => {
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length);
  });

  test('categoryById finds a category', () => {
    expect(categoryById('home')?.label).toBe('Home');
  });

  test('categoryById returns null for null and for unknown ids', () => {
    expect(categoryById(null)).toBeNull();
    expect(categoryById('nope')).toBeNull();
  });
});

describe('layout', () => {
  test('no radius exceeds 4px', () => {
    for (const value of Object.values(Layout.radius)) expect(value).toBeLessThanOrEqual(4);
  });

  test('dot spacing matches the design', () => {
    expect(Layout.dotSpacing).toBe(11);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --selectProjects logic`
Expected: FAIL — cannot resolve `@/theme/categories`.

- [ ] **Step 3: Create `src/theme/colors.ts`**

```ts
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
```

- [ ] **Step 4: Create `src/theme/layout.ts`**

```ts
export const Layout = {
  space: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { card: 3, chip: 2, stamp: 2 },
  hairline: 0.8,
  /** Dot-grid pitch in dp. Must match scripts/make-dot-tile.mjs. */
  dotSpacing: 11,
} as const;
```

- [ ] **Step 5: Create `src/theme/categories.ts`**

```ts
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
```

- [ ] **Step 6: Create `src/theme/index.ts`**

```ts
export { Colors, Palette } from './colors';
export { Layout } from './layout';
export { CATEGORIES, categoryById, isNoteCategory } from './categories';
export type { Category, NoteCategory } from './categories';
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- --selectProjects logic`
Expected: PASS — all theme token tests green.

- [ ] **Step 8: Commit**

```bash
git add src/theme src/lib/theme-tokens.test.ts
git commit -m "feat: add Kraft & Ink theme tokens"
```

---

### Task 3: Typography and font loading

**Files:**
- Create: `src/theme/typography.ts`, `src/hooks/use-app-fonts.ts`, `src/lib/typography.test.ts`
- Modify: `src/theme/index.ts`, `package.json`

**Interfaces:**
- Consumes: `Colors` (Task 2)
- Produces:
  - `FontFamily` — `{ chrome: 'Jost_400Regular', chromeMedium: 'Jost_500Medium', body: 'CourierPrime_400Regular', bodyBold: 'CourierPrime_700Bold' }`
  - `Type` — named text styles: `coverTitle, screenTitle, cardTitle, stampLabel, tabLabel, metaLabel, bodyText, excerpt`
  - `useAppFonts(): { ready: boolean }` — resolves `true` on success **and** on failure

- [ ] **Step 1: Install the font packages**

```bash
npx expo install @expo-google-fonts/jost @expo-google-fonts/courier-prime
```

Jost is the Futura-adjacent geometric sans; Courier Prime is the typewriter face. Both are needed because iOS ships Futura and Courier but Android ships neither (spec §5.2).

- [ ] **Step 2: Write the failing test**

`src/lib/typography.test.ts`:

```ts
import { FontFamily, Type } from '@/theme/typography';

describe('font families', () => {
  test('are the four bundled faces', () => {
    expect(FontFamily).toEqual({
      chrome: 'Jost_400Regular',
      chromeMedium: 'Jost_500Medium',
      body: 'CourierPrime_400Regular',
      bodyBold: 'CourierPrime_700Bold',
    });
  });
});

describe('type scale', () => {
  test('every style declares a bundled font family', () => {
    const bundled = new Set(Object.values(FontFamily));
    for (const [name, style] of Object.entries(Type)) {
      expect(bundled.has(style.fontFamily as string)).toBe(true);
      expect(typeof style.fontSize === 'number' && style.fontSize > 0).toBe(true);
    }
  });

  test('note body uses the typewriter face at generous line height', () => {
    expect(Type.bodyText.fontFamily).toBe(FontFamily.body);
    expect(Type.bodyText.lineHeight! / Type.bodyText.fontSize!).toBeGreaterThanOrEqual(1.8);
  });

  test('chrome labels use the geometric sans with wide tracking', () => {
    expect(Type.stampLabel.fontFamily).toBe(FontFamily.chromeMedium);
    expect(Type.stampLabel.letterSpacing).toBeGreaterThanOrEqual(1);
    expect(Type.tabLabel.letterSpacing).toBeGreaterThanOrEqual(0.8);
  });

  test('metadata uses the typewriter face, matching the mockup', () => {
    expect(Type.metaLabel.fontFamily).toBe(FontFamily.body);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --selectProjects logic`
Expected: FAIL — cannot resolve `@/theme/typography`.

- [ ] **Step 4: Create `src/theme/typography.ts`**

```ts
import type { TextStyle } from 'react-native';

/**
 * Bundled faces. Keys are roles; values are the exact family names the
 * @expo-google-fonts packages register.
 */
export const FontFamily = {
  chrome: 'Jost_400Regular',
  chromeMedium: 'Jost_500Medium',
  body: 'CourierPrime_400Regular',
  bodyBold: 'CourierPrime_700Bold',
} as const;

/** Type scale from spec §5.2. Letter-spacing carries the period character. */
export const Type = {
  coverTitle: { fontFamily: FontFamily.chromeMedium, fontSize: 20, letterSpacing: 0.2 },
  screenTitle: { fontFamily: FontFamily.chromeMedium, fontSize: 17, letterSpacing: 0.1 },
  cardTitle: { fontFamily: FontFamily.chromeMedium, fontSize: 15, letterSpacing: 0.1 },
  stampLabel: { fontFamily: FontFamily.chromeMedium, fontSize: 9, letterSpacing: 1.4 },
  tabLabel: { fontFamily: FontFamily.chromeMedium, fontSize: 9, letterSpacing: 0.9 },
  metaLabel: { fontFamily: FontFamily.body, fontSize: 9, letterSpacing: 0.8 },
  excerpt: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 18 },
  bodyText: { fontFamily: FontFamily.body, fontSize: 15, lineHeight: 28 },
} satisfies Record<string, TextStyle>;
```

- [ ] **Step 5: Add typography to the barrel**

Append to `src/theme/index.ts`:

```ts
export { FontFamily, Type } from './typography';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --selectProjects logic`
Expected: PASS.

- [ ] **Step 7: Create `src/hooks/use-app-fonts.ts`**

Failure must not hang the splash screen (spec §8) — `ready` becomes `true` either way, and the platform fallback face is used.

```ts
import { useFonts } from 'expo-font';
import { Jost_400Regular, Jost_500Medium } from '@expo-google-fonts/jost';
import { CourierPrime_400Regular, CourierPrime_700Bold } from '@expo-google-fonts/courier-prime';

/**
 * Loads the bundled faces. Resolves ready=true on success AND on failure:
 * degraded typography is acceptable, a stuck launch is not (spec §8).
 */
export function useAppFonts(): { ready: boolean; error: Error | null } {
  const [loaded, error] = useFonts({
    Jost_400Regular,
    Jost_500Medium,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  return { ready: loaded || error !== null, error: error ?? null };
}
```

- [ ] **Step 8: Commit**

```bash
git add src/theme/typography.ts src/theme/index.ts src/hooks/use-app-fonts.ts src/lib/typography.test.ts package.json package-lock.json bun.lock
git commit -m "feat: add Jost and Courier Prime type scale with resilient loading"
```

---

### Task 4: Date formatting and word count

**Files:**
- Create: `src/lib/format-date.ts`, `src/lib/format-date.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `formatNoteDate(ts: number, now: number): string`, `countWords(text: string): number`

- [ ] **Step 1: Write the failing test**

`src/lib/format-date.test.ts`:

```ts
import { countWords, formatNoteDate } from '@/lib/format-date';

// Fixed clock: Wednesday 9 September 2026, 14:32 local time.
const NOW = new Date(2026, 8, 9, 14, 32, 0).getTime();
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m, d, h, min).getTime();

describe('formatNoteDate', () => {
  test('today shows TODAY and the time', () => {
    expect(formatNoteDate(at(2026, 8, 9, 14, 32), NOW)).toBe('TODAY 14:32');
  });

  test('earlier today still shows TODAY', () => {
    expect(formatNoteDate(at(2026, 8, 9, 0, 5), NOW)).toBe('TODAY 00:05');
  });

  test('yesterday shows the weekday and time', () => {
    expect(formatNoteDate(at(2026, 8, 8, 8, 15), NOW)).toBe('TUE 08:15');
  });

  test('six days ago still shows the weekday', () => {
    expect(formatNoteDate(at(2026, 8, 3, 9, 0), NOW)).toBe('THU 09:00');
  });

  test('seven days ago falls back to the date', () => {
    expect(formatNoteDate(at(2026, 8, 2, 9, 0), NOW)).toBe('2 SEP');
  });

  test('earlier this year shows day and month', () => {
    expect(formatNoteDate(at(2026, 7, 12), NOW)).toBe('12 AUG');
  });

  test('a previous year includes the two-digit year', () => {
    expect(formatNoteDate(at(2025, 7, 12), NOW)).toBe('12 AUG 25');
  });

  test('a timestamp one minute after midnight today is TODAY, not yesterday', () => {
    const justAfterMidnight = at(2026, 8, 9, 0, 1);
    expect(formatNoteDate(justAfterMidnight, NOW)).toBe('TODAY 00:01');
  });

  test('a future timestamp is treated as today rather than crashing', () => {
    expect(formatNoteDate(at(2026, 8, 9, 23, 59), NOW)).toBe('TODAY 23:59');
  });
});

describe('countWords', () => {
  test.each([
    ['', 0],
    ['   ', 0],
    ['one', 1],
    ['two words', 2],
    ['  leading and trailing  ', 3],
    ['line\nbreaks\ncount', 3],
    ['multiple   spaces', 2],
  ])('counts %j as %i', (input, expected) => {
    expect(countWords(input)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --selectProjects logic -t formatNoteDate`
Expected: FAIL — cannot resolve `@/lib/format-date`.

- [ ] **Step 3: Write the implementation**

`src/lib/format-date.ts`:

```ts
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

const pad = (n: number) => String(n).padStart(2, '0');
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Relative date in the Kraft & Ink voice:
 *   today            -> "TODAY 14:32"
 *   within 6 days    -> "TUE 08:15"
 *   this year        -> "12 AUG"
 *   earlier year     -> "12 AUG 25"
 *
 * Day bucketing uses calendar-day boundaries, not 24-hour spans, so a note
 * written at 00:01 today reads TODAY rather than yesterday's weekday.
 */
export function formatNoteDate(ts: number, now: number): string {
  const then = new Date(ts);
  const today = new Date(now);
  const dayDiff = Math.round((startOfDay(today) - startOfDay(then)) / 86_400_000);
  const time = `${pad(then.getHours())}:${pad(then.getMinutes())}`;

  if (dayDiff <= 0) return `TODAY ${time}`;
  if (dayDiff < 7) return `${WEEKDAYS[then.getDay()]} ${time}`;

  const date = `${then.getDate()} ${MONTHS[then.getMonth()]}`;
  if (then.getFullYear() === today.getFullYear()) return date;
  return `${date} ${String(then.getFullYear() % 100).padStart(2, '0')}`;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --selectProjects logic`
Expected: PASS — all date and word-count tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format-date.ts src/lib/format-date.test.ts
git commit -m "feat: add relative date formatting and word count"
```

---

### Task 5: DB types, SqlDb interface, and migrations

The `SqlDb` interface is the seam that makes the data layer testable: `expo-sqlite`'s `SQLiteDatabase` satisfies it structurally, and tests supply a `node:sqlite` adapter.

**Files:**
- Create: `src/db/types.ts`, `src/db/migrations.ts`, `tests/support/test-db.ts`, `src/db/migrations.test.ts`

**Interfaces:**
- Consumes: `NoteCategory`, `isNoteCategory` (Task 2)
- Produces:
  - `SqlDb` — `{ execAsync(sql), runAsync(sql, params?), getAllAsync<T>(sql, params?), getFirstAsync<T>(sql, params?) }`
  - `SqlRunResult` — `{ lastInsertRowId: number; changes: number }`
  - `Note` — `{ id, title, body, category, pinned, createdAt, updatedAt }`
  - `NoteRow` — snake_case row shape
  - `rowToNote(row: NoteRow): Note`
  - `DATABASE_VERSION: number`, `migrate(db: SqlDb): Promise<void>`
  - `createTestDb(): SqlDb` (test support only)

- [ ] **Step 0: Install expo-sqlite**

```bash
npx expo install expo-sqlite
```

The template does not ship it, and it registers a config plugin in `app.json`.

- [ ] **Step 1: Create `src/db/types.ts`**

```ts
import { isNoteCategory, type NoteCategory } from '@/theme/categories';

export type SqlRunResult = { lastInsertRowId: number; changes: number };

/** Values SQLite can bind. Mirrors expo-sqlite's SQLiteBindValue, minus blobs. */
export type SqlValue = string | number | null | boolean;

/**
 * The narrow slice of expo-sqlite's SQLiteDatabase this app uses.
 * Declared as an interface so tests can inject a node:sqlite adapter and the
 * db layer never imports expo-sqlite directly.
 *
 * `params` is REQUIRED, not optional: expo-sqlite's overloads type it as a
 * non-optional SQLiteBindParams, so an optional parameter here is not
 * assignable from the real database. Call sites with no parameters pass `[]`.
 */
export interface SqlDb {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<SqlRunResult>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
}

export type NoteRow = {
  id: number;
  title: string;
  body: string;
  category: string | null;
  pinned: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type Note = {
  id: number;
  title: string;
  body: string;
  category: NoteCategory | null;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

/** Maps a raw row to the domain type, normalising SQLite's integer booleans. */
export function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: isNoteCategory(row.category) ? row.category : null,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

- [ ] **Step 2: Create the test adapter `tests/support/test-db.ts`**

```ts
import { DatabaseSync } from 'node:sqlite';
import type { SqlDb, SqlRunResult, SqlValue } from '@/db/types';

/**
 * Wraps Node's built-in synchronous SQLite in the async SqlDb interface so the
 * db layer can be tested against a real database engine.
 *
 * Note: node:sqlite returns `lastInsertRowid` (lowercase d); expo-sqlite uses
 * `lastInsertRowId`. This adapter normalises to expo's spelling.
 */
export function createTestDb(): SqlDb {
  const db = new DatabaseSync(':memory:');

  return {
    async execAsync(source: string): Promise<void> {
      db.exec(source);
    },
    async runAsync(source: string, params: SqlValue[]): Promise<SqlRunResult> {
      const result = db.prepare(source).run(...(params as never[]));
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },
    async getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]> {
      return db.prepare(source).all(...(params as never[])) as T[];
    },
    async getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null> {
      return (db.prepare(source).get(...(params as never[])) as T | undefined) ?? null;
    },
  };
}
```

- [ ] **Step 3: Write the failing test**

`src/db/migrations.test.ts`:

```ts
import { createTestDb } from '../../tests/support/test-db';
import { DATABASE_VERSION, migrate } from '@/db/migrations';
import type { SqlDb } from '@/db/types';

const userVersion = async (db: SqlDb) =>
  (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []))?.user_version ?? 0;

describe('migrate', () => {
  test('a fresh database starts at version 0', async () => {
    expect(await userVersion(createTestDb())).toBe(0);
  });

  test('brings a fresh database to the current version', async () => {
    const db = createTestDb();
    await migrate(db);
    expect(await userVersion(db)).toBe(DATABASE_VERSION);
  });

  test('creates the notes table with the expected columns', async () => {
    const db = createTestDb();
    await migrate(db);
    const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(notes)', []);
    expect(cols.map((c) => c.name).sort()).toEqual(
      ['body', 'category', 'created_at', 'deleted_at', 'id', 'pinned', 'title', 'updated_at'].sort()
    );
  });

  test('creates the active-notes index', async () => {
    const db = createTestDb();
    await migrate(db);
    const idx = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='notes'",
      []
    );
    expect(idx.map((i) => i.name)).toContain('idx_notes_active');
  });

  test('is idempotent — running twice does not throw or change the version', async () => {
    const db = createTestDb();
    await migrate(db);
    await migrate(db);
    expect(await userVersion(db)).toBe(DATABASE_VERSION);
  });

  test('defaults let a row be inserted with only timestamps', async () => {
    const db = createTestDb();
    await migrate(db);
    await db.runAsync('INSERT INTO notes (created_at, updated_at) VALUES (?, ?)', [1, 1]);
    const row = await db.getFirstAsync<{ title: string; body: string; pinned: number }>(
      'SELECT title, body, pinned FROM notes',
      []
    );
    expect(row).toEqual({ title: '', body: '', pinned: 0 });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- --selectProjects logic -t migrate`
Expected: FAIL — cannot resolve `@/db/migrations`.

- [ ] **Step 5: Write `src/db/migrations.ts`**

Pattern taken from the SDK 57 `expo-sqlite` docs (`PRAGMA user_version`). Never edit an existing numbered block; append a new one.

```ts
import type { SqlDb } from './types';

export const DATABASE_VERSION = 1;

/**
 * Versioned schema migration. Each block runs once, in order.
 * WAL mode is set on every run because it is a per-connection pragma.
 */
export async function migrate(db: SqlDb): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = 'wal';`);

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  let version = result?.user_version ?? 0;

  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      CREATE TABLE notes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT    NOT NULL DEFAULT '',
        body       TEXT    NOT NULL DEFAULT '',
        category   TEXT             DEFAULT NULL,
        pinned     INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER          DEFAULT NULL
      );
      CREATE INDEX idx_notes_active ON notes (deleted_at, pinned DESC, updated_at DESC);
    `);
    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --selectProjects logic`
Expected: PASS — 6 migration tests green.

- [ ] **Step 7: Commit**

```bash
git add src/db tests/support/test-db.ts
git commit -m "feat: add note schema migrations behind an injectable SqlDb"
```

---

### Task 6: Note queries — create, get, update

**Files:**
- Create: `src/db/notes.ts`, `src/db/notes-crud.test.ts`

**Interfaces:**
- Consumes: `SqlDb`, `Note`, `NoteRow`, `rowToNote` (Task 5), `migrate` (Task 5)
- Produces:
  - `createNote(db, input: { title?: string; body?: string; category?: NoteCategory | null; now: number }): Promise<number>`
  - `getNote(db, id: number): Promise<Note | null>`
  - `updateNote(db, id: number, patch: { title?: string; body?: string }, now: number): Promise<void>`

- [ ] **Step 1: Write the failing test**

`src/db/notes-crud.test.ts`:

```ts
import { createTestDb } from '../../tests/support/test-db';
import { migrate } from '@/db/migrations';
import { createNote, getNote, updateNote } from '@/db/notes';
import type { SqlDb } from '@/db/types';

const T0 = 1_757_000_000_000;

async function freshDb(): Promise<SqlDb> {
  const db = createTestDb();
  await migrate(db);
  return db;
}

describe('createNote', () => {
  test('returns the new id and stores the given fields', async () => {
    const db = await freshDb();
    const id = await createNote(db, { title: 'Grocery list', body: 'milk', now: T0 });

    expect(id).toBeGreaterThan(0);
    expect(await getNote(db, id)).toEqual({
      id,
      title: 'Grocery list',
      body: 'milk',
      category: null,
      pinned: false,
      createdAt: T0,
      updatedAt: T0,
    });
  });

  test('defaults title and body to empty strings', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    const note = await getNote(db, id);
    expect(note).toMatchObject({ title: '', body: '', category: null });
  });

  test('stores a category when given', async () => {
    const db = await freshDb();
    const id = await createNote(db, { category: 'home', now: T0 });
    expect((await getNote(db, id))?.category).toBe('home');
  });

  test('assigns increasing ids', async () => {
    const db = await freshDb();
    const first = await createNote(db, { now: T0 });
    const second = await createNote(db, { now: T0 + 1 });
    expect(second).toBeGreaterThan(first);
  });
});

describe('getNote', () => {
  test('returns null for an id that does not exist', async () => {
    const db = await freshDb();
    expect(await getNote(db, 999)).toBeNull();
  });
});

describe('updateNote', () => {
  test('updates the title and bumps updated_at, leaving created_at alone', async () => {
    const db = await freshDb();
    const id = await createNote(db, { title: 'old', body: 'body', now: T0 });

    await updateNote(db, id, { title: 'new' }, T0 + 5000);

    expect(await getNote(db, id)).toMatchObject({
      title: 'new',
      body: 'body',
      createdAt: T0,
      updatedAt: T0 + 5000,
    });
  });

  test('updates the body without touching the title', async () => {
    const db = await freshDb();
    const id = await createNote(db, { title: 'keep', body: 'old', now: T0 });
    await updateNote(db, id, { body: 'new' }, T0 + 1);
    expect(await getNote(db, id)).toMatchObject({ title: 'keep', body: 'new' });
  });

  test('updates both fields at once', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await updateNote(db, id, { title: 't', body: 'b' }, T0 + 1);
    expect(await getNote(db, id)).toMatchObject({ title: 't', body: 'b' });
  });

  test('an empty patch still bumps updated_at', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await updateNote(db, id, {}, T0 + 9);
    expect((await getNote(db, id))?.updatedAt).toBe(T0 + 9);
  });

  test('stores text containing quotes and semicolons verbatim', async () => {
    const db = await freshDb();
    const nasty = `Robert'); DROP TABLE notes;-- "quoted" 100%`;
    const id = await createNote(db, { title: nasty, body: nasty, now: T0 });
    expect(await getNote(db, id)).toMatchObject({ title: nasty, body: nasty });
    // The table must still exist.
    expect(await getNote(db, id)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --selectProjects logic -t createNote`
Expected: FAIL — cannot resolve `@/db/notes`.

- [ ] **Step 3: Write `src/db/notes.ts`**

```ts
import type { NoteCategory } from '@/theme/categories';
import { rowToNote, type Note, type NoteRow, type SqlDb } from './types';

const SELECT_NOTE = `
  SELECT id, title, body, category, pinned, created_at, updated_at, deleted_at
  FROM notes
`;

export type CreateNoteInput = {
  title?: string;
  body?: string;
  category?: NoteCategory | null;
  now: number;
};

export async function createNote(db: SqlDb, input: CreateNoteInput): Promise<number> {
  const { title = '', body = '', category = null, now } = input;
  const result = await db.runAsync(
    `INSERT INTO notes (title, body, category, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [title, body, category, now, now]
  );
  return result.lastInsertRowId;
}

export async function getNote(db: SqlDb, id: number): Promise<Note | null> {
  const row = await db.getFirstAsync<NoteRow>(
    `${SELECT_NOTE} WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return row ? rowToNote(row) : null;
}

export async function updateNote(
  db: SqlDb,
  id: number,
  patch: { title?: string; body?: string },
  now: number
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (patch.title !== undefined) {
    sets.push('title = ?');
    params.push(patch.title);
  }
  if (patch.body !== undefined) {
    sets.push('body = ?');
    params.push(patch.body);
  }

  sets.push('updated_at = ?');
  params.push(now, id);

  await db.runAsync(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, params);
}
```

The `sets` array is assembled from a fixed allowlist of column names — no caller input reaches the SQL string. Values are always bound.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --selectProjects logic`
Expected: PASS — create/get/update tests green.

- [ ] **Step 5: Commit**

```bash
git add src/db/notes.ts src/db/notes-crud.test.ts
git commit -m "feat: add note create, read and update queries"
```

---

### Task 7: Note queries — list, pin, category, soft delete, purge

**Files:**
- Modify: `src/db/notes.ts`
- Create: `src/db/notes-list.test.ts`

**Interfaces:**
- Consumes: everything from Task 6
- Produces:
  - `listNotes(db): Promise<Note[]>` — pinned first, then `updated_at` descending
  - `setPinned(db, id: number, pinned: boolean, now: number): Promise<void>`
  - `setCategory(db, id: number, category: NoteCategory | null, now: number): Promise<void>`
  - `softDelete(db, id: number, now: number): Promise<void>`
  - `restore(db, id: number): Promise<void>`
  - `hardDelete(db, id: number): Promise<void>`
  - `purgeOldDeleted(db, now: number, maxAgeMs?: number): Promise<number>`
  - `PURGE_AFTER_MS: number` (30 days)

- [ ] **Step 1: Write the failing test**

`src/db/notes-list.test.ts`:

```ts
import { createTestDb } from '../../tests/support/test-db';
import { migrate } from '@/db/migrations';
import {
  createNote, getNote, hardDelete, listNotes, PURGE_AFTER_MS,
  purgeOldDeleted, restore, setCategory, setPinned, softDelete,
} from '@/db/notes';
import type { SqlDb } from '@/db/types';

const T0 = 1_757_000_000_000;
const DAY = 86_400_000;

async function freshDb(): Promise<SqlDb> {
  const db = createTestDb();
  await migrate(db);
  return db;
}

describe('listNotes', () => {
  test('returns an empty array for an empty database', async () => {
    expect(await listNotes(await freshDb())).toEqual([]);
  });

  test('orders by updated_at descending', async () => {
    const db = await freshDb();
    await createNote(db, { title: 'oldest', now: T0 });
    await createNote(db, { title: 'newest', now: T0 + 2000 });
    await createNote(db, { title: 'middle', now: T0 + 1000 });

    expect((await listNotes(db)).map((n) => n.title)).toEqual(['newest', 'middle', 'oldest']);
  });

  test('puts pinned notes first, still ordered by updated_at within each group', async () => {
    const db = await freshDb();
    const old = await createNote(db, { title: 'pinned-old', now: T0 });
    await createNote(db, { title: 'unpinned-new', now: T0 + 5000 });
    const recent = await createNote(db, { title: 'pinned-new', now: T0 + 1000 });

    await setPinned(db, old, true, T0);
    await setPinned(db, recent, true, T0 + 1000);

    expect((await listNotes(db)).map((n) => n.title)).toEqual([
      'pinned-new', 'pinned-old', 'unpinned-new',
    ]);
  });

  test('excludes soft-deleted notes', async () => {
    const db = await freshDb();
    const keep = await createNote(db, { title: 'keep', now: T0 });
    const drop = await createNote(db, { title: 'drop', now: T0 + 1 });

    await softDelete(db, drop, T0 + 2);

    expect((await listNotes(db)).map((n) => n.id)).toEqual([keep]);
  });
});

describe('setPinned', () => {
  test('pins and unpins without changing updated_at ordering intent', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });

    await setPinned(db, id, true, T0 + 1);
    expect((await getNote(db, id))?.pinned).toBe(true);

    await setPinned(db, id, false, T0 + 2);
    expect((await getNote(db, id))?.pinned).toBe(false);
  });
});

describe('setCategory', () => {
  test('sets and clears the category', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });

    await setCategory(db, id, 'ideas', T0 + 1);
    expect((await getNote(db, id))?.category).toBe('ideas');

    await setCategory(db, id, null, T0 + 2);
    expect((await getNote(db, id))?.category).toBeNull();
  });
});

describe('softDelete and restore', () => {
  test('getNote hides a soft-deleted note', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await softDelete(db, id, T0 + 1);
    expect(await getNote(db, id)).toBeNull();
  });

  test('restore brings it back with the same id and content', async () => {
    const db = await freshDb();
    const id = await createNote(db, { title: 'back', body: 'again', now: T0 });

    await softDelete(db, id, T0 + 1);
    await restore(db, id);

    expect(await getNote(db, id)).toMatchObject({ id, title: 'back', body: 'again' });
  });
});

describe('hardDelete', () => {
  test('removes the row entirely so restore cannot recover it', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await hardDelete(db, id);
    await restore(db, id);
    expect(await getNote(db, id)).toBeNull();
  });
});

describe('purgeOldDeleted', () => {
  test('removes notes deleted longer ago than the threshold', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await softDelete(db, id, T0);

    const purged = await purgeOldDeleted(db, T0 + PURGE_AFTER_MS + DAY);

    expect(purged).toBe(1);
    await restore(db, id);
    expect(await getNote(db, id)).toBeNull();
  });

  test('keeps notes deleted within the threshold', async () => {
    const db = await freshDb();
    const id = await createNote(db, { now: T0 });
    await softDelete(db, id, T0);

    expect(await purgeOldDeleted(db, T0 + DAY)).toBe(0);

    await restore(db, id);
    expect(await getNote(db, id)).not.toBeNull();
  });

  test('never touches live notes', async () => {
    const db = await freshDb();
    await createNote(db, { title: 'alive', now: T0 });
    await purgeOldDeleted(db, T0 + PURGE_AFTER_MS * 10);
    expect((await listNotes(db)).map((n) => n.title)).toEqual(['alive']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --selectProjects logic -t listNotes`
Expected: FAIL — `listNotes is not a function`.

- [ ] **Step 3: Append the implementation to `src/db/notes.ts`**

```ts
/** Soft-deleted notes are purged after this long (spec §6). */
export const PURGE_AFTER_MS = 30 * 86_400_000;

export async function listNotes(db: SqlDb): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    `${SELECT_NOTE}
     WHERE deleted_at IS NULL
     ORDER BY pinned DESC, updated_at DESC`,
    []
  );
  return rows.map(rowToNote);
}

export async function setPinned(
  db: SqlDb, id: number, pinned: boolean, now: number
): Promise<void> {
  await db.runAsync('UPDATE notes SET pinned = ?, updated_at = ? WHERE id = ?', [
    pinned ? 1 : 0, now, id,
  ]);
}

export async function setCategory(
  db: SqlDb, id: number, category: NoteCategory | null, now: number
): Promise<void> {
  await db.runAsync('UPDATE notes SET category = ?, updated_at = ? WHERE id = ?', [
    category, now, id,
  ]);
}

export async function softDelete(db: SqlDb, id: number, now: number): Promise<void> {
  await db.runAsync('UPDATE notes SET deleted_at = ? WHERE id = ?', [now, id]);
}

export async function restore(db: SqlDb, id: number): Promise<void> {
  await db.runAsync('UPDATE notes SET deleted_at = NULL WHERE id = ?', [id]);
}

/** Used for notes abandoned empty — nothing to restore, so no soft delete. */
export async function hardDelete(db: SqlDb, id: number): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}

/** Returns the number of rows purged. Run on app start. */
export async function purgeOldDeleted(
  db: SqlDb, now: number, maxAgeMs: number = PURGE_AFTER_MS
): Promise<number> {
  const result = await db.runAsync(
    'DELETE FROM notes WHERE deleted_at IS NOT NULL AND deleted_at < ?',
    [now - maxAgeMs]
  );
  return result.changes;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --selectProjects logic`
Expected: PASS — list/pin/category/delete/purge tests green.

- [ ] **Step 5: Commit**

```bash
git add src/db/notes.ts src/db/notes-list.test.ts
git commit -m "feat: add note listing, pinning, soft delete and purge"
```

---

### Task 8: Search with LIKE escaping

`LIKE` treats `%` and `_` as wildcards. A user searching for "100%" must not match everything.

**Files:**
- Create: `src/lib/like.ts`, `src/lib/like.test.ts`, `src/db/notes-search.test.ts`
- Modify: `src/db/notes.ts`

**Interfaces:**
- Consumes: Task 7
- Produces: `escapeLike(query: string): string`, `LIKE_ESCAPE_CHAR: string`, `searchNotes(db, query: string): Promise<Note[]>`

- [ ] **Step 1: Write the failing test for the escaper**

`src/lib/like.test.ts`:

```ts
import { escapeLike, LIKE_ESCAPE_CHAR } from '@/lib/like';

describe('escapeLike', () => {
  test('leaves ordinary text alone', () => {
    expect(escapeLike('coffee')).toBe('coffee');
  });

  test('escapes percent so it matches literally', () => {
    expect(escapeLike('100%')).toBe('100\\%');
  });

  test('escapes underscore so it matches literally', () => {
    expect(escapeLike('a_b')).toBe('a\\_b');
  });

  test('escapes the escape character itself, first', () => {
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  test('handles a string of only wildcards', () => {
    expect(escapeLike('%_%')).toBe('\\%\\_\\%');
  });

  test('exposes the escape character used', () => {
    expect(LIKE_ESCAPE_CHAR).toBe('\\');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --selectProjects logic -t escapeLike`
Expected: FAIL — cannot resolve `@/lib/like`.

- [ ] **Step 3: Write `src/lib/like.ts`**

```ts
export const LIKE_ESCAPE_CHAR = '\\';

/**
 * Escapes SQL LIKE wildcards so user input matches literally.
 * The escape character must be replaced first, or later replacements would
 * double-escape the backslashes this function itself inserts.
 * Pair with: LIKE ? ESCAPE '\'
 */
export function escapeLike(query: string): string {
  return query
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --selectProjects logic -t escapeLike`
Expected: PASS.

- [ ] **Step 5: Write the failing search test**

`src/db/notes-search.test.ts`:

```ts
import { createTestDb } from '../../tests/support/test-db';
import { migrate } from '@/db/migrations';
import { createNote, searchNotes, softDelete } from '@/db/notes';
import type { SqlDb } from '@/db/types';

const T0 = 1_757_000_000_000;

async function seeded(): Promise<SqlDb> {
  const db = createTestDb();
  await migrate(db);
  await createNote(db, { title: 'Grocery list', body: 'milk and the good coffee', now: T0 });
  await createNote(db, { title: 'New flat', body: 'boiler service record', now: T0 + 1 });
  await createNote(db, { title: 'Discount', body: 'saved 100% on shipping', now: T0 + 2 });
  return db;
}

describe('searchNotes', () => {
  test('matches on title', async () => {
    expect((await searchNotes(await seeded(), 'grocery')).map((n) => n.title)).toEqual([
      'Grocery list',
    ]);
  });

  test('matches on body', async () => {
    expect((await searchNotes(await seeded(), 'boiler')).map((n) => n.title)).toEqual(['New flat']);
  });

  test('is case-insensitive', async () => {
    expect((await searchNotes(await seeded(), 'GROCERY')).map((n) => n.title)).toEqual([
      'Grocery list',
    ]);
  });

  test('matches a substring mid-word', async () => {
    expect((await searchNotes(await seeded(), 'offee')).map((n) => n.title)).toEqual([
      'Grocery list',
    ]);
  });

  test('returns an empty array when nothing matches', async () => {
    expect(await searchNotes(await seeded(), 'zzzz')).toEqual([]);
  });

  test('treats % as a literal character, not a wildcard', async () => {
    const results = await searchNotes(await seeded(), '100%');
    expect(results.map((n) => n.title)).toEqual(['Discount']);
  });

  test('a bare % matches only notes containing a literal percent sign', async () => {
    const results = await searchNotes(await seeded(), '%');
    expect(results.map((n) => n.title)).toEqual(['Discount']);
  });

  test('a bare _ matches nothing here rather than every note', async () => {
    expect(await searchNotes(await seeded(), '_')).toEqual([]);
  });

  test('an empty query returns no results', async () => {
    expect(await searchNotes(await seeded(), '')).toEqual([]);
  });

  test('a whitespace-only query returns no results', async () => {
    expect(await searchNotes(await seeded(), '   ')).toEqual([]);
  });

  test('excludes soft-deleted notes', async () => {
    const db = await seeded();
    const id = await createNote(db, { title: 'Secret', now: T0 + 3 });
    await softDelete(db, id, T0 + 4);
    expect(await searchNotes(db, 'Secret')).toEqual([]);
  });

  test('orders results most recently updated first', async () => {
    const db = createTestDb();
    await migrate(db);
    await createNote(db, { title: 'note one', now: T0 });
    await createNote(db, { title: 'note two', now: T0 + 100 });
    expect((await searchNotes(db, 'note')).map((n) => n.title)).toEqual(['note two', 'note one']);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --selectProjects logic -t searchNotes`
Expected: FAIL — `searchNotes is not a function`.

- [ ] **Step 7: Append `searchNotes` to `src/db/notes.ts`**

```ts
import { escapeLike, LIKE_ESCAPE_CHAR } from '@/lib/like';

/**
 * Case-insensitive substring search over title and body.
 * LIKE with a bound parameter — the query is never interpolated. If note
 * counts ever make this slow, the migration path is an FTS5 virtual table
 * synced by trigger, which would change only this function (spec §6).
 */
export async function searchNotes(db: SqlDb, query: string): Promise<Note[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const pattern = `%${escapeLike(trimmed)}%`;
  const rows = await db.getAllAsync<NoteRow>(
    `${SELECT_NOTE}
     WHERE deleted_at IS NULL
       AND (title LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'
         OR body  LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}')
     ORDER BY updated_at DESC`,
    [pattern, pattern]
  );
  return rows.map(rowToNote);
}
```

`LIKE_ESCAPE_CHAR` is a module constant, not user input, so embedding it in the SQL text is safe; the search term itself is bound.

- [ ] **Step 8: Run the full logic suite**

Run: `npm test -- --selectProjects logic`
Expected: PASS — all db and lib tests green.

- [ ] **Step 9: Commit**

```bash
git add src/lib/like.ts src/lib/like.test.ts src/db/notes.ts src/db/notes-search.test.ts
git commit -m "feat: add note search with literal wildcard handling"
```

---

### Task 9: Autosave state machine

Pure logic, extracted from React so it can be tested with fake timers in the fast project.

**Files:**
- Create: `src/lib/autosave.ts`, `src/lib/autosave.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved'`
  - `createAutosaver<T>(opts: { save: (value: T) => Promise<void>; delay?: number }): Autosaver<T>`
  - `Autosaver<T>` — `{ change(value: T): void; flush(): Promise<void>; status(): SaveStatus; subscribe(fn: (s: SaveStatus) => void): () => void; dispose(): void }`

- [ ] **Step 1: Write the failing test**

`src/lib/autosave.test.ts`:

```ts
import { createAutosaver } from '@/lib/autosave';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const flushMicrotasks = () => Promise.resolve();

describe('createAutosaver', () => {
  test('starts idle', () => {
    const saver = createAutosaver({ save: jest.fn() });
    expect(saver.status()).toBe('idle');
  });

  test('does not save before the delay elapses', () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 600 });

    saver.change('a');
    jest.advanceTimersByTime(599);

    expect(save).not.toHaveBeenCalled();
  });

  test('saves once the delay elapses', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 600 });

    saver.change('hello');
    jest.advanceTimersByTime(600);
    await flushMicrotasks();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('hello');
  });

  test('coalesces a burst of changes into one save with the latest value', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 600 });

    saver.change('h');
    jest.advanceTimersByTime(100);
    saver.change('he');
    jest.advanceTimersByTime(100);
    saver.change('hello');
    jest.advanceTimersByTime(600);
    await flushMicrotasks();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('hello');
  });

  test('reports saved after a successful write', async () => {
    const saver = createAutosaver({ save: jest.fn().mockResolvedValue(undefined), delay: 10 });

    saver.change('x');
    jest.advanceTimersByTime(10);
    await flushMicrotasks();

    expect(saver.status()).toBe('saved');
  });

  test('flush writes immediately without waiting for the delay', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 10_000 });

    saver.change('urgent');
    await saver.flush();

    expect(save).toHaveBeenCalledWith('urgent');
    expect(saver.status()).toBe('saved');
  });

  test('flush with no pending change does not call save', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 10 });

    await saver.flush();

    expect(save).not.toHaveBeenCalled();
  });

  test('flush cancels the pending timer so the value is not saved twice', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 600 });

    saver.change('once');
    await saver.flush();
    jest.advanceTimersByTime(600);
    await flushMicrotasks();

    expect(save).toHaveBeenCalledTimes(1);
  });

  test('reports unsaved when the write fails and keeps the value for retry', async () => {
    const save = jest.fn()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValueOnce(undefined);
    const saver = createAutosaver({ save, delay: 10 });

    saver.change('keep me');
    jest.advanceTimersByTime(10);
    await flushMicrotasks();
    expect(saver.status()).toBe('unsaved');

    await saver.flush();
    expect(save).toHaveBeenLastCalledWith('keep me');
    expect(saver.status()).toBe('saved');
  });

  test('notifies subscribers of status transitions', async () => {
    const seen: string[] = [];
    const saver = createAutosaver({ save: jest.fn().mockResolvedValue(undefined), delay: 10 });
    saver.subscribe((s) => seen.push(s));

    saver.change('x');
    jest.advanceTimersByTime(10);
    await flushMicrotasks();

    expect(seen).toEqual(['saving', 'saved']);
  });

  test('unsubscribe stops notifications', async () => {
    const seen: string[] = [];
    const saver = createAutosaver({ save: jest.fn().mockResolvedValue(undefined), delay: 10 });
    const off = saver.subscribe((s) => seen.push(s));

    off();
    saver.change('x');
    jest.advanceTimersByTime(10);
    await flushMicrotasks();

    expect(seen).toEqual([]);
  });

  test('dispose cancels a pending save', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const saver = createAutosaver({ save, delay: 600 });

    saver.change('never');
    saver.dispose();
    jest.advanceTimersByTime(600);
    await flushMicrotasks();

    expect(save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --selectProjects logic -t createAutosaver`
Expected: FAIL — cannot resolve `@/lib/autosave`.

- [ ] **Step 3: Write `src/lib/autosave.ts`**

```ts
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved';

export type Autosaver<T> = {
  change(value: T): void;
  flush(): Promise<void>;
  status(): SaveStatus;
  subscribe(fn: (status: SaveStatus) => void): () => void;
  dispose(): void;
};

export const DEFAULT_AUTOSAVE_DELAY = 600;

/**
 * Debounced save with explicit flush. Framework-free so it can be unit tested.
 *
 * On failure the pending value is retained and status becomes 'unsaved', so the
 * next keystroke or blur retries it. User input is never discarded (spec §8).
 */
export function createAutosaver<T>(opts: {
  save: (value: T) => Promise<void>;
  delay?: number;
}): Autosaver<T> {
  const delay = opts.delay ?? DEFAULT_AUTOSAVE_DELAY;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { value: T } | null = null;
  let current: SaveStatus = 'idle';
  const listeners = new Set<(status: SaveStatus) => void>();

  const setStatus = (next: SaveStatus) => {
    if (next === current) return;
    current = next;
    for (const fn of listeners) fn(next);
  };

  const cancelTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const write = async (): Promise<void> => {
    if (pending === null) return;
    const { value } = pending;

    setStatus('saving');
    try {
      await opts.save(value);
      // Only clear if no newer change arrived while awaiting.
      if (pending !== null && pending.value === value) pending = null;
      setStatus('saved');
    } catch {
      setStatus('unsaved');
    }
  };

  return {
    change(value: T) {
      pending = { value };
      cancelTimer();
      timer = setTimeout(() => {
        timer = null;
        void write();
      }, delay);
    },

    async flush() {
      cancelTimer();
      await write();
    },

    status: () => current,

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    dispose() {
      cancelTimer();
      listeners.clear();
      pending = null;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --selectProjects logic`
Expected: PASS — 13 autosave tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/autosave.ts src/lib/autosave.test.ts
git commit -m "feat: add debounced autosave state machine"
```

---

### Task 10: Dot-grid tile asset

React Native has no radial-gradient, so the dot grid is a repeating image tile. `resizeMode="repeat"` is supported on iOS and Android.

**Files:**
- Create: `scripts/make-dot-tile.mjs`, `assets/images/dot-grid.png`

**Interfaces:**
- Consumes: `Layout.dotSpacing` = 11 (Task 2)
- Produces: `assets/images/dot-grid.png` — 11×11 px, one `#D6C8AC` dot on transparent

- [ ] **Step 1: Write the generator**

`scripts/make-dot-tile.mjs`:

```js
// Generates an 11x11 dot tile for the Kraft & Ink dot-grid paper.
// Pure Node — zlib and crc32 only, no dependencies.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const SIZE = 11;          // must match Layout.dotSpacing
const DOT = [0xd6, 0xc8, 0xac]; // Palette.rule
const RADIUS = 0.9;

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

// RGBA raw scanlines, each prefixed with filter byte 0.
const raw = [];
const centre = 1.5;
for (let y = 0; y < SIZE; y++) {
  raw.push(0);
  for (let x = 0; x < SIZE; x++) {
    const dist = Math.hypot(x - centre, y - centre);
    const alpha = dist <= RADIUS ? 255 : dist <= RADIUS + 0.7 ? 110 : 0;
    raw.push(DOT[0], DOT[1], DOT[2], alpha);
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // colour type RGBA
ihdr[10] = 0;  // deflate
ihdr[11] = 0;  // adaptive filtering
ihdr[12] = 0;  // no interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(Buffer.from(raw), { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync('assets/images', { recursive: true });
writeFileSync('assets/images/dot-grid.png', png);
console.log(`wrote assets/images/dot-grid.png (${SIZE}x${SIZE}, ${png.length} bytes)`);
```

- [ ] **Step 2: Generate the asset**

Run: `node scripts/make-dot-tile.mjs`
Expected: `wrote assets/images/dot-grid.png (11x11, ~200 bytes)`

- [ ] **Step 3: Verify the PNG is valid and correctly sized**

Run: `sips -g pixelWidth -g pixelHeight -g hasAlpha assets/images/dot-grid.png`
Expected: `pixelWidth: 11`, `pixelHeight: 11`, `hasAlpha: yes`

- [ ] **Step 4: Commit**

```bash
git add scripts/make-dot-tile.mjs assets/images/dot-grid.png
git commit -m "feat: generate dot-grid paper tile"
```

---

### Task 11: Kraft primitives — Paper, Stamp, CoverHeader, CategorySquare

**Files:**
- Create: `src/components/kraft/paper.tsx`, `stamp.tsx`, `cover-header.tsx`, `category-square.tsx`, `primitives.test.tsx`
- Delete: `src/components/kraft/smoke.test.tsx`

**Interfaces:**
- Consumes: `Colors`, `Layout`, `Type` (Tasks 2–3), `assets/images/dot-grid.png` (Task 10)
- Produces:
  - `<Paper style?>{children}</Paper>` — fills its parent with dot-grid paper
  - `<Stamp label rotate?>` — bordered uppercase label
  - `<CoverHeader title subtitle? stamp?>` — kraft block
  - `<CategorySquare category size?>` — renders `null` when `category` is `null`

- [ ] **Step 1: Write the failing test**

`src/components/kraft/primitives.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

import { CategorySquare } from './category-square';
import { CoverHeader } from './cover-header';
import { Stamp } from './stamp';

describe('Stamp', () => {
  test('renders its label uppercased', async () => {
    await render(<Stamp label="no. 014 · field" />);
    expect(screen.getByText('NO. 014 · FIELD')).toBeOnTheScreen();
  });
});

describe('CoverHeader', () => {
  test('renders the title', async () => {
    await render(<CoverHeader title="Notebook" />);
    expect(screen.getByText('Notebook')).toBeOnTheScreen();
  });

  test('renders the subtitle when given', async () => {
    await render(<CoverHeader title="Notebook" subtitle="14 entries" />);
    expect(screen.getByText('14 entries')).toBeOnTheScreen();
  });

  test('renders the stamp when given', async () => {
    await render(<CoverHeader title="Notebook" stamp="no. 014" />);
    expect(screen.getByText('NO. 014')).toBeOnTheScreen();
  });

  test('omits the subtitle element when not given', async () => {
    await render(<CoverHeader title="Notebook" />);
    expect(screen.queryByTestId('cover-subtitle')).toBeNull();
  });
});

describe('CategorySquare', () => {
  test('renders a square tinted with the category colour', async () => {
    await render(<CategorySquare category="home" />);
    const square = screen.getByTestId('category-square-home');
    expect(square).toHaveStyle({ backgroundColor: '#2F6C69' });
  });

  test('renders nothing when the category is null', async () => {
    await render(<CategorySquare category={null} />);
    expect(screen.queryByTestId(/category-square/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --selectProjects native`
Expected: FAIL — cannot resolve `./category-square`.

- [ ] **Step 3: Create `src/components/kraft/paper.tsx`**

```tsx
import { ImageBackground, StyleSheet, type ViewProps } from 'react-native';

import { Colors } from '@/theme';

/**
 * Dot-grid paper. The grid is a repeating 11x11 tile because React Native has
 * no radial-gradient and a View-per-dot would be thousands of nodes.
 */
export function Paper({ style, children, ...rest }: ViewProps) {
  return (
    <ImageBackground
      source={require('@/assets/images/dot-grid.png')}
      resizeMode="repeat"
      style={[styles.paper, style]}
      {...rest}>
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  paper: { flex: 1, backgroundColor: Colors.surface.page },
});
```

- [ ] **Step 4: Create `src/components/kraft/stamp.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Type } from '@/theme';

export type StampProps = {
  label: string;
  /** Degrees of rotation; the mockup uses a slight counter-clockwise tilt. */
  rotate?: number;
  tone?: 'onKraft' | 'onPaper';
};

export function Stamp({ label, rotate = -1.4, tone = 'onKraft' }: StampProps) {
  const color = tone === 'onKraft' ? Colors.text.onKraft : Colors.accent;

  return (
    <View
      style={[styles.stamp, { borderColor: color, transform: [{ rotate: `${rotate}deg` }] }]}>
      <Text style={[Type.stampLabel, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: Layout.radius.stamp,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
});
```

- [ ] **Step 5: Create `src/components/kraft/cover-header.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Layout, Type } from '@/theme';
import { Stamp } from './stamp';

export type CoverHeaderProps = {
  title: string;
  subtitle?: string;
  stamp?: string;
  right?: React.ReactNode;
};

/** The kraft "cover" that the dot-grid page scrolls beneath. */
export function CoverHeader({ title, subtitle, stamp, right }: CoverHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.cover, { paddingTop: insets.top + Layout.space.sm }]}>
      <View style={styles.topRow}>
        {stamp ? <Stamp label={stamp} /> : null}
        {right}
      </View>
      <Text style={[Type.coverTitle, styles.title]}>{title}</Text>
      {subtitle ? (
        <Text testID="cover-subtitle" style={[Type.metaLabel, styles.subtitle]}>
          {subtitle.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: Colors.surface.cover,
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.md,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: Colors.text.onKraft, marginTop: Layout.space.sm },
  subtitle: { color: Colors.text.onKraft, opacity: 0.78, marginTop: Layout.space.xs },
});
```

- [ ] **Step 6: Create `src/components/kraft/category-square.tsx`**

```tsx
import { StyleSheet, View } from 'react-native';

import { categoryById, Layout, type NoteCategory } from '@/theme';

export type CategorySquareProps = {
  category: NoteCategory | null;
  size?: number;
};

/** Colour-coded category mark. Renders nothing for an uncategorised note. */
export function CategorySquare({ category, size = 10 }: CategorySquareProps) {
  const resolved = categoryById(category);
  if (resolved === null) return null;

  return (
    <View
      testID={`category-square-${resolved.id}`}
      style={[styles.square, { width: size, height: size, backgroundColor: resolved.color }]}
    />
  );
}

const styles = StyleSheet.create({
  square: { borderRadius: Layout.radius.chip },
});
```

- [ ] **Step 7: Delete the smoke test and run the suite**

```bash
rm src/components/kraft/smoke.test.tsx
```

Run: `npm test -- --selectProjects native`
Expected: PASS — 7 primitive tests green.

- [ ] **Step 8: Commit**

```bash
git add src/components/kraft
git rm --cached src/components/kraft/smoke.test.tsx 2>/dev/null || true
git commit -m "feat: add kraft paper, stamp, cover header and category square"
```

---

### Task 12: NoteCard and Fab

**Files:**
- Create: `src/components/kraft/note-card.tsx`, `src/components/kraft/fab.tsx`, `src/components/kraft/note-card.test.tsx`

**Interfaces:**
- Consumes: `Note` (Task 5), `formatNoteDate` (Task 4), `CategorySquare` (Task 11)
- Produces:
  - `<NoteCard note now onPress />`
  - `<Fab onPress accessibilityLabel />`

- [ ] **Step 1: Write the failing test**

`src/components/kraft/note-card.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Note } from '@/db/types';
import { NoteCard } from './note-card';

const NOW = new Date(2026, 8, 9, 14, 32).getTime();

const note = (over: Partial<Note> = {}): Note => ({
  id: 1,
  title: 'Grocery list',
  body: 'milk · the good coffee · bread',
  category: null,
  pinned: false,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

describe('NoteCard', () => {
  test('shows the title and a body excerpt', async () => {
    await render(<NoteCard note={note()} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByText('Grocery list')).toBeOnTheScreen();
    expect(screen.getByText('milk · the good coffee · bread')).toBeOnTheScreen();
  });

  test('shows the formatted date', async () => {
    await render(<NoteCard note={note()} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByText('TODAY 14:32')).toBeOnTheScreen();
  });

  test('shows a placeholder title for an untitled note', async () => {
    await render(<NoteCard note={note({ title: '' })} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByText('Untitled')).toBeOnTheScreen();
  });

  test('shows the pinned chip only when pinned', async () => {
    await render(<NoteCard note={note({ pinned: true })} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByText('PINNED')).toBeOnTheScreen();
  });

  test('omits the pinned chip when not pinned', async () => {
    await render(<NoteCard note={note()} now={NOW} onPress={jest.fn()} />);
    expect(screen.queryByText('PINNED')).toBeNull();
  });

  test('renders the category square when categorised', async () => {
    await render(<NoteCard note={note({ category: 'lists' })} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByTestId('category-square-lists')).toBeOnTheScreen();
  });

  test('calls onPress with the note id', async () => {
    const onPress = jest.fn();
    await render(<NoteCard note={note({ id: 42 })} now={NOW} onPress={onPress} />);

    await fireEvent.press(screen.getByTestId('note-card-42'));

    expect(onPress).toHaveBeenCalledWith(42);
  });

  test('renders an empty body without crashing', async () => {
    await render(<NoteCard note={note({ body: '' })} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByText('Grocery list')).toBeOnTheScreen();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --selectProjects native -t NoteCard`
Expected: FAIL — cannot resolve `./note-card`.

- [ ] **Step 3: Create `src/components/kraft/note-card.tsx`**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Note } from '@/db/types';
import { formatNoteDate } from '@/lib/format-date';
import { Colors, Layout, Type } from '@/theme';
import { CategorySquare } from './category-square';

export type NoteCardProps = {
  note: Note;
  now: number;
  onPress: (id: number) => void;
};

export function NoteCard({ note, now, onPress }: NoteCardProps) {
  return (
    <Pressable
      testID={`note-card-${note.id}`}
      onPress={() => onPress(note.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.titleRow}>
        <CategorySquare category={note.category} />
        <Text style={[Type.cardTitle, styles.title]} numberOfLines={1}>
          {note.title.trim() === '' ? 'Untitled' : note.title}
        </Text>
      </View>

      {note.body.trim() === '' ? null : (
        <Text style={[Type.excerpt, styles.excerpt]} numberOfLines={2}>
          {note.body}
        </Text>
      )}

      <View style={styles.metaRow}>
        <Text style={[Type.metaLabel, styles.date]}>{formatNoteDate(note.updatedAt, now)}</Text>
        {note.pinned ? (
          <View style={styles.pin}>
            <Text style={[Type.stampLabel, styles.pinText]}>PINNED</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface.card,
    borderRadius: Layout.radius.card,
    borderWidth: Layout.hairline,
    borderColor: Colors.border.card,
    marginHorizontal: Layout.space.md,
    marginTop: Layout.space.sm,
    paddingHorizontal: Layout.space.md,
    paddingVertical: Layout.space.md,
  },
  pressed: { opacity: 0.72 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.space.sm },
  title: { color: Colors.text.primary, flexShrink: 1 },
  excerpt: { color: Colors.text.secondary, marginTop: Layout.space.xs },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Layout.space.sm,
  },
  date: { color: Colors.text.secondary },
  pin: {
    backgroundColor: Colors.accent,
    borderRadius: Layout.radius.chip,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pinText: { color: Colors.text.onKraft, fontSize: 7, letterSpacing: 1.3 },
});
```

- [ ] **Step 4: Create `src/components/kraft/fab.tsx`**

```tsx
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, FontFamily, Layout } from '@/theme';

export type FabProps = {
  onPress: () => void;
  accessibilityLabel: string;
};

export function Fab({ onPress, accessibilityLabel }: FabProps) {
  return (
    <Pressable
      testID="fab"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
      <Text style={styles.plus}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Layout.space.lg,
    bottom: Layout.space.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  plus: { color: Colors.text.onKraft, fontFamily: FontFamily.chrome, fontSize: 26, lineHeight: 30 },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --selectProjects native`
Expected: PASS — 8 NoteCard tests green.

- [ ] **Step 6: Commit**

```bash
git add src/components/kraft/note-card.tsx src/components/kraft/fab.tsx src/components/kraft/note-card.test.tsx
git commit -m "feat: add note card and floating action button"
```

---

### Task 13: App shell — fonts, database provider, migration error screen

**Files:**
- Create: `src/components/kraft/error-screen.tsx`
- Modify: `src/app/_layout.tsx`
- Delete: `src/app/index.tsx`, `src/app/explore.tsx`, `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`

**Interfaces:**
- Consumes: `useAppFonts` (Task 3), `migrate` + `purgeOldDeleted` (Tasks 5, 7)
- Produces: a mounted `SQLiteProvider` with `databaseName="notes.db"`; `useSQLiteContext()` is available to all screens

- [ ] **Step 1: Create `src/components/kraft/error-screen.tsx`**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Type } from '@/theme';
import { Stamp } from './stamp';

export type ErrorScreenProps = {
  title: string;
  detail: string;
  onRetry?: () => void;
};

/** Blocking failure screen. Never silently continue on an unknown schema. */
export function ErrorScreen({ title, detail, onRetry }: ErrorScreenProps) {
  return (
    <View style={styles.root}>
      <Stamp label="error" tone="onPaper" />
      <Text style={[Type.coverTitle, styles.title]}>{title}</Text>
      <Text style={[Type.excerpt, styles.detail]}>{detail}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={[Type.tabLabel, styles.retryText]}>TRY AGAIN</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface.page,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: Layout.space.xl,
    gap: Layout.space.md,
  },
  title: { color: Colors.text.primary },
  detail: { color: Colors.text.secondary },
  retry: {
    marginTop: Layout.space.md,
    backgroundColor: Colors.accent,
    borderRadius: Layout.radius.card,
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
  },
  retryText: { color: Colors.text.onKraft },
});
```

- [ ] **Step 2: Replace `src/app/_layout.tsx`**

```tsx
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';

import { ErrorScreen } from '@/components/kraft/error-screen';
import { migrate } from '@/db/migrations';
import { purgeOldDeleted } from '@/db/notes';
import type { SqlDb } from '@/db/types';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { Colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready: fontsReady } = useAppFonts();
  const [dbError, setDbError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const onInit = useCallback(async (db: SqlDb) => {
    try {
      await migrate(db);
      await purgeOldDeleted(db, Date.now());
      setDbError(null);
    } catch (error) {
      setDbError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      await SplashScreen.hideAsync();
    }
  }, []);

  if (!fontsReady) return null;

  if (dbError) {
    return (
      <ErrorScreen
        title="Could not open your notebook"
        detail={dbError.message}
        onRetry={() => {
          setDbError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  return (
    <SQLiteProvider key={attempt} databaseName="notes.db" onInit={onInit}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.surface.page } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="note/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </SQLiteProvider>
  );
}
```

`key={attempt}` remounts the provider so retry re-runs `onInit`.

- [ ] **Step 3: Delete the template screens and native tab bar**

```bash
git rm src/app/index.tsx src/app/explore.tsx src/components/app-tabs.tsx src/components/app-tabs.web.tsx
```

`NativeTabs` is removed because it renders the platform tab bar and exposes only `backgroundColor`, `indicatorColor` and `labelStyle` — it cannot produce a kraft bar with a bundled font (spec §4.1).

- [ ] **Step 4: Verify types still compile**

Run: `npx tsc --noEmit`
Expected: errors ONLY about the not-yet-created `(tabs)` route and `note/[id]`. Those are Tasks 14–17. Any other error must be fixed now.

- [ ] **Step 5: Commit**

```bash
git add src/app/_layout.tsx src/components/kraft/error-screen.tsx
git commit -m "feat: wire fonts, sqlite provider and migration failure screen"
```

---

### Task 14: Kraft tab bar and tabs layout

**Files:**
- Create: `src/components/kraft/tab-bar.tsx`, `src/app/(tabs)/_layout.tsx`, `src/components/kraft/tab-bar.test.tsx`

**Interfaces:**
- Consumes: `Colors`, `Type` (Tasks 2–3)
- Produces: `<KraftTabBar {...BottomTabBarProps} />`; routes `(tabs)/index` labelled NOTES and `(tabs)/search` labelled FIND

- [ ] **Step 1: Write the failing test**

`src/components/kraft/tab-bar.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import { KraftTabBar, TAB_LABELS } from './tab-bar';

function makeProps(activeIndex = 0, emit = jest.fn()) {
  return {
    state: {
      index: activeIndex,
      routes: [
        { key: 'index-1', name: 'index' },
        { key: 'search-1', name: 'search' },
      ],
    },
    navigation: { emit, navigate: jest.fn() },
    descriptors: {},
  } as never;
}

describe('KraftTabBar', () => {
  test('renders a label for each route', async () => {
    await render(<KraftTabBar {...makeProps()} />);
    expect(screen.getByText(TAB_LABELS.index)).toBeOnTheScreen();
    expect(screen.getByText(TAB_LABELS.search)).toBeOnTheScreen();
  });

  test('tints the active tab with the accent colour', async () => {
    await render(<KraftTabBar {...makeProps(0)} />);
    expect(screen.getByText(TAB_LABELS.index)).toHaveStyle({ color: '#9C4A33' });
  });

  test('renders inactive tabs in the secondary colour', async () => {
    await render(<KraftTabBar {...makeProps(0)} />);
    expect(screen.getByText(TAB_LABELS.search)).toHaveStyle({ color: '#8A7C64' });
  });

  test('pressing a tab emits tabPress for that route', async () => {
    const emit = jest.fn().mockReturnValue({ defaultPrevented: false });
    await render(<KraftTabBar {...makeProps(0, emit)} />);

    await fireEvent.press(screen.getByTestId('tab-search'));

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'search-1' })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --selectProjects native -t KraftTabBar`
Expected: FAIL — cannot resolve `./tab-bar`.

- [ ] **Step 3: Create `src/components/kraft/tab-bar.tsx`**

```tsx
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Layout, Type } from '@/theme';

export const TAB_LABELS: Record<string, string> = {
  index: 'NOTES',
  search: 'FIND',
};

export function KraftTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + Layout.space.sm }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = TAB_LABELS[route.name] ?? route.name.toUpperCase();

        return (
          <Pressable
            key={route.key}
            testID={`tab-${route.name}`}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            style={styles.tab}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}>
            <Text
              style={[
                Type.tabLabel,
                { color: focused ? Colors.accent : Colors.text.secondary },
              ]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface.card,
    borderTopWidth: Layout.hairline,
    borderTopColor: Colors.border.hairline,
    paddingTop: Layout.space.md,
  },
  tab: { flex: 1, alignItems: 'center' },
});
```

- [ ] **Step 4: Create `src/app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';

import { KraftTabBar } from '@/components/kraft/tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <KraftTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
    </Tabs>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --selectProjects native -t KraftTabBar`
Expected: PASS — 4 tab bar tests green.

- [ ] **Step 6: Commit**

```bash
git add src/components/kraft/tab-bar.tsx src/components/kraft/tab-bar.test.tsx "src/app/(tabs)/_layout.tsx"
git commit -m "feat: replace native tabs with kraft tab bar"
```

---

### Task 15: Notes list screen

**Files:**
- Create: `src/hooks/use-notes.ts`, `src/components/kraft/empty-state.tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/index.test.tsx`

**Interfaces:**
- Consumes: `listNotes` (Task 7), `NoteCard` + `Fab` (Task 12), `Paper` + `CoverHeader` (Task 11)
- Produces:
  - `useNotes(): { notes: Note[]; loading: boolean; reload: () => void }`
  - `<EmptyState stamp title detail? />`

- [ ] **Step 1: Create `src/hooks/use-notes.ts`**

Re-reads on focus rather than keeping a client cache: SQLite is the cache, and re-querying is simpler and strictly more correct than in-memory diffing (spec §4.4).

```ts
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listNotes, searchNotes } from '@/db/notes';
import type { Note } from '@/db/types';

export function useNotes(query?: string): { notes: Note[]; loading: boolean; reload: () => void } {
  const db = useSQLiteContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = query === undefined ? await listNotes(db) : await searchNotes(db, query);
    setNotes(rows);
    setLoading(false);
  }, [db, query]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void load().catch(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  return { notes, loading, reload: () => void load() };
}
```

- [ ] **Step 2: Create `src/components/kraft/empty-state.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Type } from '@/theme';
import { Stamp } from './stamp';

export type EmptyStateProps = {
  stamp: string;
  title: string;
  detail?: string;
};

export function EmptyState({ stamp, title, detail }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <Stamp label={stamp} tone="onPaper" rotate={-2.5} />
      <Text style={[Type.cardTitle, styles.title]}>{title}</Text>
      {detail ? <Text style={[Type.excerpt, styles.detail]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingTop: Layout.space.xxl * 2, gap: Layout.space.md },
  title: { color: Colors.text.primary },
  detail: { color: Colors.text.secondary, textAlign: 'center', paddingHorizontal: Layout.space.xl },
});
```

- [ ] **Step 3: Write the failing screen test**

`src/app/(tabs)/index.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';

import type { Note } from '@/db/types';
import NotesScreen from './index';

const NOW = new Date(2026, 8, 9, 14, 32).getTime();

const mockNotes: Note[] = [
  {
    id: 1, title: 'Grocery list', body: 'milk', category: 'lists',
    pinned: false, createdAt: NOW, updatedAt: NOW,
  },
];

let currentNotes: Note[] = mockNotes;

jest.mock('@/hooks/use-notes', () => ({
  useNotes: () => ({ notes: currentNotes, loading: false, reload: jest.fn() }),
}));

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn() }),
}));

describe('NotesScreen', () => {
  beforeEach(() => {
    currentNotes = mockNotes;
  });

  test('renders the cover title', async () => {
    await render(<NotesScreen />);
    await waitFor(() => expect(screen.getByText('Notebook')).toBeOnTheScreen());
  });

  test('renders a card per note', async () => {
    await render(<NotesScreen />);
    await waitFor(() => expect(screen.getByText('Grocery list')).toBeOnTheScreen());
  });

  test('shows the empty state when there are no notes', async () => {
    currentNotes = [];
    await render(<NotesScreen />);
    await waitFor(() => expect(screen.getByText('NO ENTRIES YET')).toBeOnTheScreen());
  });

  test('renders the new-note button', async () => {
    await render(<NotesScreen />);
    await waitFor(() => expect(screen.getByTestId('fab')).toBeOnTheScreen());
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- --selectProjects native -t NotesScreen`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 5: Create `src/app/(tabs)/index.tsx`**

```tsx
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { CoverHeader } from '@/components/kraft/cover-header';
import { EmptyState } from '@/components/kraft/empty-state';
import { Fab } from '@/components/kraft/fab';
import { NoteCard } from '@/components/kraft/note-card';
import { Paper } from '@/components/kraft/paper';
import { useNotes } from '@/hooks/use-notes';
import { Layout } from '@/theme';

export default function NotesScreen() {
  const router = useRouter();
  const { notes } = useNotes();
  const now = Date.now();

  const entryCount = notes.length === 1 ? '1 entry' : `${notes.length} entries`;

  return (
    <View style={styles.root}>
      <CoverHeader
        title="Notebook"
        subtitle={`${entryCount} · all saved`}
        stamp={`no. ${String(notes.length).padStart(3, '0')} · field`}
      />
      <Paper>
        <FlatList
          data={notes}
          keyExtractor={(note) => String(note.id)}
          renderItem={({ item }) => (
            <NoteCard note={item} now={now} onPress={(id) => router.push(`/note/${id}`)} />
          )}
          ListEmptyComponent={
            <EmptyState
              stamp="no entries yet"
              title="NO ENTRIES YET"
              detail="Tap the button below to write your first note."
            />
          }
          contentContainerStyle={styles.list}
        />
        <Fab accessibilityLabel="New note" onPress={() => router.push('/note/new')} />
      </Paper>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingBottom: Layout.space.xxl * 3 },
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --selectProjects native -t NotesScreen`
Expected: PASS — 4 screen tests green.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-notes.ts src/components/kraft/empty-state.tsx "src/app/(tabs)/index.tsx" "src/app/(tabs)/index.test.tsx"
git commit -m "feat: add notes list screen"
```

---

### Task 16: Editor screen with autosave

**Files:**
- Create: `src/hooks/use-note.ts`, `src/hooks/use-autosave.ts`, `src/app/note/[id].tsx`
- Test: `src/hooks/use-autosave.test.tsx`

**Interfaces:**
- Consumes: `createAutosaver` (Task 9), `createNote`/`getNote`/`updateNote` (Task 6), `hardDelete` (Task 7), `countWords` (Task 4)
- Produces:
  - `useNote(id: number | null): { note: Note | null; loading: boolean }`
  - `useAutosave<T>(save, delay?): { status: SaveStatus; change: (v: T) => void; flush: () => Promise<void> }`

- [ ] **Step 1: Create `src/hooks/use-note.ts`**

```ts
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { getNote } from '@/db/notes';
import type { Note } from '@/db/types';

export function useNote(id: number | null): { note: Note | null; loading: boolean } {
  const db = useSQLiteContext();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(id !== null);

  useEffect(() => {
    if (id === null) {
      setNote(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getNote(db, id)
      .then((found) => {
        if (!cancelled) {
          setNote(found);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [db, id]);

  return { note, loading };
}
```

- [ ] **Step 2: Write the failing test for the hook**

`src/hooks/use-autosave.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react-native';

import { useAutosave } from './use-autosave';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useAutosave', () => {
  test('starts idle', async () => {
    const { result } = await renderHook(() => useAutosave(jest.fn(), 600));
    expect(result.current.status).toBe('idle');
  });

  test('saves after the delay and reports saved', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() => useAutosave(save, 600));

    await act(() => result.current.change('hello'));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(save).toHaveBeenCalledWith('hello');
    expect(result.current.status).toBe('saved');
  });

  test('flush saves immediately', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() => useAutosave(save, 10_000));

    await act(() => result.current.change('urgent'));
    await act(async () => {
      await result.current.flush();
    });

    expect(save).toHaveBeenCalledWith('urgent');
  });

  test('reports unsaved when the write fails', async () => {
    const save = jest.fn().mockRejectedValue(new Error('nope'));
    const { result } = await renderHook(() => useAutosave(save, 10));

    await act(() => result.current.change('x'));
    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    expect(result.current.status).toBe('unsaved');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --selectProjects native -t useAutosave`
Expected: FAIL — cannot resolve `./use-autosave`.

- [ ] **Step 4: Create `src/hooks/use-autosave.ts`**

```ts
import { useEffect, useMemo, useRef, useState } from 'react';

import { createAutosaver, DEFAULT_AUTOSAVE_DELAY, type SaveStatus } from '@/lib/autosave';

/**
 * React wrapper over the pure autosaver. The save callback is held in a ref so
 * changing it does not recreate the saver and drop a pending write.
 */
export function useAutosave<T>(
  save: (value: T) => Promise<void>,
  delay: number = DEFAULT_AUTOSAVE_DELAY
) {
  const saveRef = useRef(save);
  saveRef.current = save;

  const [status, setStatus] = useState<SaveStatus>('idle');

  const saver = useMemo(
    () => createAutosaver<T>({ save: (value) => saveRef.current(value), delay }),
    [delay]
  );

  useEffect(() => {
    const unsubscribe = saver.subscribe(setStatus);
    return () => {
      unsubscribe();
      void saver.flush().finally(() => saver.dispose());
    };
  }, [saver]);

  return {
    status,
    change: saver.change,
    flush: saver.flush,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --selectProjects native -t useAutosave`
Expected: PASS — 4 hook tests green.

- [ ] **Step 6: Create `src/app/note/[id].tsx`**

A note is created on the first keystroke, not on screen open, so opening and backing out leaves no empty row (spec §7.2).

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Paper } from '@/components/kraft/paper';
import { createNote, hardDelete, updateNote } from '@/db/notes';
import { useNote } from '@/hooks/use-note';
import { useAutosave } from '@/hooks/use-autosave';
import { countWords, formatNoteDate } from '@/lib/format-date';
import { Colors, Layout, Type } from '@/theme';

type Draft = { title: string; body: string };

const STATUS_TEXT = {
  idle: '',
  saving: 'SAVING…',
  saved: 'SAVED ✓',
  unsaved: 'UNSAVED',
} as const;

export default function EditorScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const isNew = rawId === 'new';
  const parsed = isNew ? null : Number(rawId);
  const existingId = parsed !== null && Number.isFinite(parsed) ? parsed : null;

  const { note, loading } = useNote(existingId);
  const [draft, setDraft] = useState<Draft>({ title: '', body: '' });
  const noteIdRef = useRef<number | null>(existingId);
  const hydrated = useRef(false);

  useEffect(() => {
    if (note && !hydrated.current) {
      setDraft({ title: note.title, body: note.body });
      hydrated.current = true;
    }
  }, [note]);

  // A missing note redirects rather than rendering an empty editor (spec §8).
  useEffect(() => {
    if (!isNew && !loading && note === null) router.replace('/');
  }, [isNew, loading, note, router]);

  const persist = useCallback(
    async (value: Draft) => {
      const now = Date.now();
      if (noteIdRef.current === null) {
        noteIdRef.current = await createNote(db, { ...value, now });
      } else {
        await updateNote(db, noteIdRef.current, value, now);
      }
    },
    [db]
  );

  const { status, change, flush } = useAutosave<Draft>(persist);

  const edit = useCallback(
    (patch: Partial<Draft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        change(next);
        return next;
      });
    },
    [change]
  );

  const leave = useCallback(async () => {
    await flush();
    // Discard a note that was opened and left completely empty.
    const empty = draft.title.trim() === '' && draft.body.trim() === '';
    if (empty && noteIdRef.current !== null) {
      await hardDelete(db, noteIdRef.current);
    }
    router.back();
  }, [db, draft, flush, router]);

  const timestamp = note?.updatedAt ?? Date.now();

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Layout.space.sm }]}>
        <Pressable testID="editor-back" onPress={leave} hitSlop={12}>
          <Text style={[Type.tabLabel, styles.barText]}>‹ NOTEBOOK</Text>
        </Pressable>
        <Text testID="save-status" style={[Type.tabLabel, styles.barText]}>
          {STATUS_TEXT[status]}
        </Text>
      </View>

      <Paper>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
            <TextInput
              testID="title-input"
              value={draft.title}
              onChangeText={(title) => edit({ title })}
              placeholder="Title"
              placeholderTextColor={Colors.text.secondary}
              style={[Type.screenTitle, styles.title]}
            />
            <Text style={[Type.metaLabel, styles.meta]}>
              {`${formatNoteDate(timestamp, Date.now())} · ${countWords(draft.body)} WORDS`}
            </Text>

            <View style={styles.bodyWrap}>
              <View style={styles.marginRule} />
              <TextInput
                testID="body-input"
                value={draft.body}
                onChangeText={(body) => edit({ body })}
                placeholder="Start writing…"
                placeholderTextColor={Colors.text.secondary}
                multiline
                textAlignVertical="top"
                style={[Type.bodyText, styles.body]}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Paper>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  bar: {
    backgroundColor: Colors.surface.cover,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.md,
  },
  barText: { color: Colors.text.onKraft },
  page: { padding: Layout.space.lg, paddingBottom: Layout.space.xxl * 2 },
  title: { color: Colors.text.primary, paddingVertical: Layout.space.xs },
  meta: { color: Colors.text.secondary, marginBottom: Layout.space.lg },
  bodyWrap: { flexDirection: 'row', gap: Layout.space.md },
  marginRule: { width: 1, backgroundColor: Colors.marginRule, opacity: 0.55 },
  body: { color: Colors.text.primary, flex: 1, minHeight: 320 },
});
```

- [ ] **Step 7: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/use-note.ts src/hooks/use-autosave.ts src/hooks/use-autosave.test.tsx "src/app/note/[id].tsx"
git commit -m "feat: add note editor with debounced autosave"
```

---

### Task 17: Search screen with match highlighting

**Files:**
- Create: `src/lib/highlight.ts`, `src/lib/highlight.test.ts`, `src/app/(tabs)/search.tsx`

**Interfaces:**
- Consumes: `useNotes(query)` (Task 15), `NoteCard` (Task 12)
- Produces: `splitOnMatch(text: string, query: string): Segment[]` where `Segment = { text: string; match: boolean }`

- [ ] **Step 1: Write the failing test**

`src/lib/highlight.test.ts`:

```ts
import { splitOnMatch } from '@/lib/highlight';

describe('splitOnMatch', () => {
  test('returns one unmatched segment when the query is empty', () => {
    expect(splitOnMatch('hello', '')).toEqual([{ text: 'hello', match: false }]);
  });

  test('splits around a single match', () => {
    expect(splitOnMatch('the good coffee', 'good')).toEqual([
      { text: 'the ', match: false },
      { text: 'good', match: true },
      { text: ' coffee', match: false },
    ]);
  });

  test('matches case-insensitively but preserves the original casing', () => {
    expect(splitOnMatch('Grocery List', 'grocery')).toEqual([
      { text: 'Grocery', match: true },
      { text: ' List', match: false },
    ]);
  });

  test('splits around every occurrence', () => {
    expect(splitOnMatch('aXaXa', 'x')).toEqual([
      { text: 'a', match: false },
      { text: 'X', match: true },
      { text: 'a', match: false },
      { text: 'X', match: true },
      { text: 'a', match: false },
    ]);
  });

  test('handles a match at the very start and end', () => {
    expect(splitOnMatch('abc', 'abc')).toEqual([{ text: 'abc', match: true }]);
  });

  test('returns the whole string unmatched when there is no match', () => {
    expect(splitOnMatch('hello', 'zzz')).toEqual([{ text: 'hello', match: false }]);
  });

  test('treats regex metacharacters in the query literally', () => {
    expect(splitOnMatch('cost is 100% today', '100%')).toEqual([
      { text: 'cost is ', match: false },
      { text: '100%', match: true },
      { text: ' today', match: false },
    ]);
    expect(splitOnMatch('a.b', '.')).toEqual([
      { text: 'a', match: false },
      { text: '.', match: true },
      { text: 'b', match: false },
    ]);
  });

  test('does not hang on a query of only regex specials', () => {
    expect(splitOnMatch('plain text', '(*)')).toEqual([{ text: 'plain text', match: false }]);
  });

  test('handles an empty subject string', () => {
    expect(splitOnMatch('', 'x')).toEqual([{ text: '', match: false }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --selectProjects logic -t splitOnMatch`
Expected: FAIL — cannot resolve `@/lib/highlight`.

- [ ] **Step 3: Write `src/lib/highlight.ts`**

```ts
export type Segment = { text: string; match: boolean };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Splits text into matched and unmatched runs for search highlighting.
 * The query is regex-escaped, so metacharacters match literally.
 */
export function splitOnMatch(text: string, query: string): Segment[] {
  const needle = query.trim();
  if (needle === '' || text === '') return [{ text, match: false }];

  const pattern = new RegExp(`(${escapeRegExp(needle)})`, 'gi');
  const parts = text.split(pattern).filter((part) => part !== '');

  if (parts.length === 0) return [{ text, match: false }];

  const lowerNeedle = needle.toLowerCase();
  return parts.map((part) => ({ text: part, match: part.toLowerCase() === lowerNeedle }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --selectProjects logic -t splitOnMatch`
Expected: PASS — 9 highlight tests green.

- [ ] **Step 5: Create `src/app/(tabs)/search.tsx`**

```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/kraft/empty-state';
import { NoteCard } from '@/components/kraft/note-card';
import { Paper } from '@/components/kraft/paper';
import { useNotes } from '@/hooks/use-notes';
import { Colors, Layout, Type } from '@/theme';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { notes } = useNotes(query);
  const now = Date.now();

  const searching = query.trim() !== '';

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Layout.space.sm }]}>
        <TextInput
          testID="search-input"
          value={query}
          onChangeText={setQuery}
          placeholder="find in all entries…"
          placeholderTextColor={Colors.text.secondary}
          autoCorrect={false}
          style={[Type.metaLabel, styles.input]}
        />
      </View>

      <Paper>
        <FlatList
          data={notes}
          keyExtractor={(note) => String(note.id)}
          renderItem={({ item }) => (
            <NoteCard note={item} now={now} onPress={(id) => router.push(`/note/${id}`)} />
          )}
          ListEmptyComponent={
            searching ? (
              <EmptyState stamp="nothing filed" title="NOTHING FILED UNDER…" detail={query} />
            ) : (
              <EmptyState stamp="find" title="SEARCH YOUR NOTEBOOK" detail="Type to look through every entry." />
            )
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      </Paper>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    backgroundColor: Colors.surface.cover,
    paddingHorizontal: Layout.space.lg,
    paddingBottom: Layout.space.md,
  },
  input: {
    backgroundColor: Colors.surface.card,
    borderWidth: Layout.hairline,
    borderColor: Colors.border.card,
    borderRadius: Layout.radius.card,
    color: Colors.text.primary,
    paddingHorizontal: Layout.space.md,
    paddingVertical: Layout.space.md,
    fontSize: 13,
  },
  list: { paddingBottom: Layout.space.xxl * 2 },
});
```

`splitOnMatch` is wired into `NoteCard` in Task 18; this task lands the search screen and the tested helper.

- [ ] **Step 6: Commit**

```bash
git add src/lib/highlight.ts src/lib/highlight.test.ts "src/app/(tabs)/search.tsx"
git commit -m "feat: add search screen and match highlighting helper"
```

---

### Task 18: Delete with undo, pin and category actions

**Files:**
- Create: `src/components/kraft/confirm-dialog.tsx`, `src/components/kraft/undo-bar.tsx`, `src/components/kraft/note-actions.test.tsx`
- Modify: `src/app/note/[id].tsx`, `src/components/kraft/note-card.tsx`

**Interfaces:**
- Consumes: `softDelete`, `restore`, `setPinned`, `setCategory` (Task 7), `splitOnMatch` (Task 17)
- Produces:
  - `<ConfirmDialog visible title detail confirmLabel onConfirm onCancel />`
  - `<UndoBar visible message onUndo onDismiss />`
  - `NoteCard` gains an optional `highlight?: string` prop

- [ ] **Step 1: Write the failing test**

`src/components/kraft/note-actions.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ConfirmDialog } from './confirm-dialog';
import { NoteCard } from './note-card';
import { UndoBar } from './undo-bar';
import type { Note } from '@/db/types';

const NOW = new Date(2026, 8, 9, 14, 32).getTime();
const note: Note = {
  id: 7, title: 'Grocery list', body: 'the good coffee', category: null,
  pinned: false, createdAt: NOW, updatedAt: NOW,
};

describe('ConfirmDialog', () => {
  test('renders nothing when not visible', async () => {
    await render(
      <ConfirmDialog visible={false} title="Delete?" confirmLabel="DELETE"
        onConfirm={jest.fn()} onCancel={jest.fn()} />
    );
    expect(screen.queryByText('Delete?')).toBeNull();
  });

  test('shows the title and detail when visible', async () => {
    await render(
      <ConfirmDialog visible title="Delete this note?" detail="This cannot be undone later."
        confirmLabel="DELETE" onConfirm={jest.fn()} onCancel={jest.fn()} />
    );
    expect(screen.getByText('Delete this note?')).toBeOnTheScreen();
    expect(screen.getByText('This cannot be undone later.')).toBeOnTheScreen();
  });

  test('calls onConfirm when the confirm button is pressed', async () => {
    const onConfirm = jest.fn();
    await render(
      <ConfirmDialog visible title="Delete?" confirmLabel="DELETE"
        onConfirm={onConfirm} onCancel={jest.fn()} />
    );
    await fireEvent.press(screen.getByTestId('confirm-accept'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel when the cancel button is pressed', async () => {
    const onCancel = jest.fn();
    await render(
      <ConfirmDialog visible title="Delete?" confirmLabel="DELETE"
        onConfirm={jest.fn()} onCancel={onCancel} />
    );
    await fireEvent.press(screen.getByTestId('confirm-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('UndoBar', () => {
  test('renders nothing when not visible', async () => {
    await render(<UndoBar visible={false} message="Note deleted" onUndo={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.queryByText('Note deleted')).toBeNull();
  });

  test('shows the message and calls onUndo', async () => {
    const onUndo = jest.fn();
    await render(<UndoBar visible message="Note deleted" onUndo={onUndo} onDismiss={jest.fn()} />);

    expect(screen.getByText('Note deleted')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('undo-action'));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});

describe('NoteCard highlighting', () => {
  test('splits the title around the highlighted query', async () => {
    await render(<NoteCard note={note} now={NOW} onPress={jest.fn()} highlight="grocery" />);
    expect(screen.getByTestId('note-card-7')).toBeOnTheScreen();
    expect(screen.getByText('Grocery')).toBeOnTheScreen();
  });

  test('renders the plain title when no highlight is given', async () => {
    await render(<NoteCard note={note} now={NOW} onPress={jest.fn()} />);
    expect(screen.getByText('Grocery list')).toBeOnTheScreen();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --selectProjects native -t ConfirmDialog`
Expected: FAIL — cannot resolve `./confirm-dialog`.

- [ ] **Step 3: Create `src/components/kraft/confirm-dialog.tsx`**

```tsx
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Type } from '@/theme';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  detail?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible, title, detail, confirmLabel, onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <Text style={[Type.cardTitle, styles.title]}>{title}</Text>
          {detail ? <Text style={[Type.excerpt, styles.detail]}>{detail}</Text> : null}

          <View style={styles.actions}>
            <Pressable testID="confirm-cancel" onPress={onCancel} style={styles.cancel}>
              <Text style={[Type.tabLabel, styles.cancelText]}>CANCEL</Text>
            </Pressable>
            <Pressable testID="confirm-accept" onPress={onConfirm} style={styles.accept}>
              <Text style={[Type.tabLabel, styles.acceptText]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(34, 48, 63, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.space.xl,
  },
  sheet: {
    width: '100%',
    backgroundColor: Colors.surface.card,
    borderRadius: Layout.radius.card,
    borderWidth: Layout.hairline,
    borderColor: Colors.border.card,
    padding: Layout.space.lg,
    gap: Layout.space.sm,
  },
  title: { color: Colors.text.primary },
  detail: { color: Colors.text.secondary },
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
    borderColor: Colors.border.hairline,
    borderRadius: Layout.radius.chip,
  },
  cancelText: { color: Colors.text.secondary },
  accept: {
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
    backgroundColor: Colors.accent,
    borderRadius: Layout.radius.chip,
  },
  acceptText: { color: Colors.text.onKraft },
});
```

- [ ] **Step 4: Create `src/components/kraft/undo-bar.tsx`**

```tsx
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Type } from '@/theme';

export type UndoBarProps = {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  timeoutMs?: number;
};

export function UndoBar({ visible, message, onUndo, onDismiss, timeoutMs = 5000 }: UndoBarProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, timeoutMs]);

  if (!visible) return null;

  return (
    <View style={styles.bar}>
      <Text style={[Type.metaLabel, styles.message]}>{message}</Text>
      <Pressable testID="undo-action" onPress={onUndo} hitSlop={10}>
        <Text style={[Type.tabLabel, styles.action]}>UNDO</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Layout.space.md,
    right: Layout.space.md,
    bottom: Layout.space.lg,
    backgroundColor: Colors.text.primary,
    borderRadius: Layout.radius.card,
    paddingHorizontal: Layout.space.lg,
    paddingVertical: Layout.space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: { color: Colors.text.onKraft },
  action: { color: Colors.surface.cover },
});
```

- [ ] **Step 5: Add the `highlight` prop to `NoteCard`**

In `src/components/kraft/note-card.tsx`, add the import:

```tsx
import { splitOnMatch } from '@/lib/highlight';
```

Extend the props type:

```tsx
export type NoteCardProps = {
  note: Note;
  now: number;
  onPress: (id: number) => void;
  /** When set, occurrences of this query are marked in the title. */
  highlight?: string;
};
```

Replace the title `<Text>` with:

```tsx
<Text style={[Type.cardTitle, styles.title]} numberOfLines={1}>
  {note.title.trim() === ''
    ? 'Untitled'
    : highlight
      ? splitOnMatch(note.title, highlight).map((segment, i) => (
          <Text key={i} style={segment.match ? styles.match : undefined}>
            {segment.text}
          </Text>
        ))
      : note.title}
</Text>
```

Add to the stylesheet:

```tsx
match: { backgroundColor: '#F5E27F' },
```

That yellow is a marker-pen highlight, so add it to the palette rather than inlining it. In `src/theme/colors.ts` add `marker: '#F5E27F'` to `Palette` and `highlight: Palette.marker` to `Colors`, then use `Colors.highlight` here. Update `src/lib/theme-tokens.test.ts`'s role list to include `Colors.highlight`.

- [ ] **Step 6: Wire delete, pin and category into the editor**

In `src/app/note/[id].tsx`, add imports:

```tsx
import { ConfirmDialog } from '@/components/kraft/confirm-dialog';
import { setCategory, setPinned, softDelete } from '@/db/notes';
import { CATEGORIES } from '@/theme';
```

Add state and handlers inside the component:

```tsx
const [confirming, setConfirming] = useState(false);

const remove = useCallback(async () => {
  setConfirming(false);
  if (noteIdRef.current !== null) {
    await softDelete(db, noteIdRef.current, Date.now());
  }
  router.replace('/');
}, [db, router]);

const togglePin = useCallback(async () => {
  if (noteIdRef.current === null) return;
  await setPinned(db, noteIdRef.current, !(note?.pinned ?? false), Date.now());
}, [db, note]);

const chooseCategory = useCallback(
  async (id: (typeof CATEGORIES)[number]['id'] | null) => {
    if (noteIdRef.current === null) return;
    await setCategory(db, noteIdRef.current, id, Date.now());
  },
  [db]
);
```

Add the action row below the metadata line, and the dialog before the closing `</View>`:

```tsx
<View style={styles.actionRow}>
  <Pressable testID="action-pin" onPress={togglePin} hitSlop={8}>
    <Text style={[Type.tabLabel, styles.action]}>
      {note?.pinned ? 'UNPIN' : 'PIN'}
    </Text>
  </Pressable>
  {CATEGORIES.map((category) => (
    <Pressable
      key={category.id}
      testID={`action-category-${category.id}`}
      onPress={() => chooseCategory(category.id)}
      hitSlop={8}>
      <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
    </Pressable>
  ))}
  <Pressable testID="action-delete" onPress={() => setConfirming(true)} hitSlop={8}>
    <Text style={[Type.tabLabel, styles.destructive]}>DELETE</Text>
  </Pressable>
</View>
```

```tsx
<ConfirmDialog
  visible={confirming}
  title="Delete this note?"
  detail="You can undo this from the notebook."
  confirmLabel="DELETE"
  onConfirm={remove}
  onCancel={() => setConfirming(false)}
/>
```

Add the styles:

```tsx
actionRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: Layout.space.md,
  marginBottom: Layout.space.lg,
},
action: { color: Colors.text.secondary },
destructive: { color: Colors.accent, marginLeft: 'auto' },
categoryDot: { width: 12, height: 12, borderRadius: Layout.radius.chip },
```

- [ ] **Step 7: Wire undo into the list screen**

In `src/app/(tabs)/index.tsx`, track the last deleted id and render `UndoBar`:

```tsx
const [undoId, setUndoId] = useState<number | null>(null);
const db = useSQLiteContext();
const { notes, reload } = useNotes();
```

```tsx
<UndoBar
  visible={undoId !== null}
  message="Note deleted"
  onUndo={async () => {
    if (undoId !== null) await restore(db, undoId);
    setUndoId(null);
    reload();
  }}
  onDismiss={() => setUndoId(null)}
/>
```

The editor sets this via a router param: change `router.replace('/')` in `remove` to
`router.replace({ pathname: '/', params: { deleted: String(noteIdRef.current) } })`, and in the
list screen read it with `useLocalSearchParams<{ deleted?: string }>()`, feeding a `useEffect`
that calls `setUndoId(Number(deleted))` when present and finite.

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS — all logic and native tests green.

- [ ] **Step 9: Commit**

```bash
git add src/components/kraft src/app src/theme/colors.ts src/lib/theme-tokens.test.ts
git commit -m "feat: add delete with undo, pinning and category actions"
```

---

### Task 19: Remove template leftovers and verify

**Files:**
- Modify: `src/constants/theme.ts`
- Delete: template demo components that nothing imports

**Interfaces:**
- Consumes: everything
- Produces: a clean tree where `Colors` resolves only to `src/theme`

- [ ] **Step 1: Find every remaining reference to the old theme and demo components**

```bash
grep -rn "constants/theme\|hint-row\|web-badge\|animated-icon\|external-link\|ui/collapsible\|themed-text\|themed-view\|use-color-scheme\|use-theme" src/ || echo "no references"
```

- [ ] **Step 2: Delete the demo components that have no references**

```bash
git rm src/components/hint-row.tsx src/components/web-badge.tsx \
       src/components/animated-icon.tsx src/components/animated-icon.web.tsx \
       src/components/animated-icon.module.css src/components/external-link.tsx \
       src/components/ui/collapsible.tsx \
       src/components/themed-text.tsx src/components/themed-view.tsx \
       src/hooks/use-theme.ts src/hooks/use-color-scheme.ts src/hooks/use-color-scheme.web.ts
```

If Step 1 showed a reference to any of these, remove the usage first, then delete.

Deleting `use-color-scheme.web.ts` also clears the pre-existing
`react-hooks/set-state-in-effect` lint error noted in Task 1 Step 4c. `use-theme`
and `themed-text`/`themed-view` all exist to switch between light and dark
palettes, which this design does not have (spec §A3).

- [ ] **Step 3: Reduce `src/constants/theme.ts` to what is still used**

Delete the `Colors` export (superseded by `src/theme/colors.ts`) and any `Fonts` export
(superseded by `src/theme/typography.ts`). Keep `MaxContentWidth` only if something still
imports it; otherwise delete the file and its `@/global.css` import moves to
`src/app/_layout.tsx`.

- [ ] **Step 4: Verify types, lint and tests all pass**

```bash
npx tsc --noEmit
npx expo lint
npm test
```

Expected: no type errors, no lint errors, all tests pass. Fix anything that fails before committing — do not claim success without seeing this output.

- [ ] **Step 5: Verify the app actually runs on a device**

```bash
npx expo start
```

Check by eye against `docs/design/note-taker-design-directions.pdf` p.02:
- kraft header with the stamp, dot-grid paper beneath
- cards in `#F7F0E1` with hairline borders
- Jost in the chrome, Courier Prime in note bodies and dates
- brick FAB bottom right
- create a note, background the app, reopen it — the note is still there
- delete a note, tap UNDO — it comes back
- search for a term with a `%` in it — only the literal match appears

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove template scaffolding superseded by Kraft & Ink"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task(s) |
|---|---|
| §3 in-scope 1 — notes list | 15 |
| §3 in-scope 2 — editor, autosave, word count | 9, 16 |
| §3 in-scope 3 — delete with confirm + undo | 18 |
| §3 in-scope 4 — pin/unpin | 7, 18 |
| §3 in-scope 5 — categories | 2, 11, 18 |
| §3 in-scope 6 — search | 8, 17 |
| §3 in-scope 7 — theme system | 2, 3, 10, 11 |
| §4.1 — replace NativeTabs, retire Colors light/dark | 13, 14, 19 |
| §4.2 — layer boundaries | enforced by Global Constraints; verified in 19 Step 1 |
| §5.1 — palette | 2 |
| §5.2 — typography + font loading | 3 |
| §5.3 — categories | 2 |
| §5.4 — restrained motion, no glass/symbols | Global Constraints; press states in 12, 18 |
| §6 — data model, migrations, soft delete, purge | 5, 6, 7 |
| §7.1/7.2/7.3 — three screens | 15, 16, 17 |
| §8 — migration failure | 13 |
| §8 — font failure | 3 |
| §8 — autosave failure | 9, 16 |
| §8 — missing note id redirect | 16 |
| §8 — empty note on exit | 16 |
| §9 — test setup and the five test areas | 1, 4, 5–9, 11–18 |

No spec requirement is unassigned.

**Type consistency:** `SqlDb` (Task 5) is consumed unchanged by Tasks 6–8. `Note` field names (`createdAt`, `updatedAt`, `pinned: boolean`) are used consistently in Tasks 6, 7, 12, 15, 16. `SaveStatus` values `idle|saving|saved|unsaved` (Task 9) match `STATUS_TEXT` keys in Task 16. `formatNoteDate(ts, now)` keeps its two-argument shape in Tasks 4, 12, 16. `createTestDb()` normalises node:sqlite's `lastInsertRowid` to expo's `lastInsertRowId`, matching `SqlRunResult`.

**Fixed during Task 5 execution:** two gaps in the data layer. (a) No task
installed `expo-sqlite` — added as Task 5 Step 0. (b) `SqlDb` declared
`params?: unknown[]`, which the real `SQLiteDatabase` is **not** assignable to,
because expo types the parameter as a non-optional `SQLiteBindParams`. The
interface now uses a required `params: SqlValue[]`, every no-parameter query
passes `[]`, and `src/db/types.test.ts` carries a type-level guard
(`Assert<SQLiteDatabase extends SqlDb ? true : false>`) that was verified to
fail `tsc` when the two diverge. The guard must stay type-only — a value
assignment throws at runtime, since there is no `SQLiteDatabase` to construct
in a Node test environment.

**Fixed during Task 1 execution:** `@testing-library/react-native` v14 turned out to be fully async and to have dropped the `extend-expect` entry point. Every component and hook test in Tasks 11–18 was rewritten to `await` the RNTL calls with `async` test callbacks, and the two new Global Constraints above were added. This was discovered by running the Task 1 smoke test, which is exactly what that task exists for.

**Fixed during review:** Task 12's `fab.tsx` originally referenced `Layout_RIGHT`/`Layout_BOTTOM` constants declared *below* the `StyleSheet.create()` call. Since `StyleSheet.create()` runs at module evaluation, that is a temporal-dead-zone throw on import, not a latent risk. Now uses `Layout.space.lg`.
