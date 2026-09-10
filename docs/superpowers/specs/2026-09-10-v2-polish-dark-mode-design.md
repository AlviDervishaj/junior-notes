# V2 Polish — Runtime Theming and Lamplight Dark Mode

**Date:** 2026-09-10
**Status:** Pending review
**Supersedes:** assumption A3 and the dark-mode claim in §5.1 of
`docs/superpowers/specs/2026-09-09-note-taker-design.md`

## 1. Purpose

Ship dark mode for the Kraft & Ink note taker, and run the app on real hardware for
the first time.

The v1 spec assumed dark mode would be cheap. It is not, and §2 explains why. This
document replaces that assumption with a measured one and specifies the refactor that
makes it true going forward.

## 2. The premise v1 got wrong

v1 §5.1 states that semantic role indirection makes dark mode "a palette change rather
than a component rewrite". That is false as built.

`Colors` is a static `const`, and **47 of its 53 usages sit inside `StyleSheet.create`
blocks**, which run once at module evaluation. Reassigning the palette at runtime would
re-style nothing. The indirection v1 built is real, but it is at the *naming* level, not
the *runtime* level.

The indirection is still worth having — it means this document changes how colours are
*delivered*, not which colours each component asks for. Every call site keeps its
semantic role name.

## 3. Scope

### In scope

1. **Runtime theming** — colours resolved per render from the system appearance.
2. **The Lamplight dark palette** — §5.
3. **Per-scheme category colours** — forced by the contrast findings in §6.
4. **A dark dot-grid tile** — §7.
5. **Native configuration** for automatic appearance — §8.
6. **A device pass** on the iOS simulator — §10.

### Out of scope

- **The `expo-font` config plugin.** Deferred. It cannot run in Expo Go, so it requires
  a dev build, which requires CocoaPods or EAS Build. It is a startup-time optimisation
  and the least valuable of the three items originally bundled into "polish". It gets
  its own spec once a dev build exists.
- **Any manual theme toggle.** The app has no settings surface, and adding one to hold a
  single switch would be a larger change than the refactor it sits beside. The scheme
  follows the system, full stop.
- **Android and web verification.** Android is where the bundled-font risk actually
  lives, but no Android SDK is installed on the development machine. Noted as follow-up.
- Any change to layout, spacing, the type scale, or light-theme appearance.

### The non-negotiable constraint

**The light theme must not shift by a single hex digit.** Every light value in §5 is
copied from the shipped `src/theme/colors.ts`. A test asserts this.

## 4. Architecture

### 4.1 Token shape

`src/theme/colors.ts` grows from one `Colors` object to a record keyed by scheme:

```ts
export type Scheme = 'light' | 'dark';
export type ThemeColors = {
  text: { primary: string; secondary: string; onKraft: string };
  surface: { page: string; card: string; cover: string };
  accent: string;
  border: { hairline: string; card: string };
  marginRule: string;
  highlight: string;
};

// Both members are filled from the palette table in §5, which is exhaustive.
export const Schemes: Record<Scheme, ThemeColors> = { light: …, dark: … };
```

`Palette` stays as the light raw-colour source and gains a `PaletteDark` sibling. Both
live in `src/theme/`, so the v1 global constraint — *no colour literals outside
`src/theme/`* — survives unchanged.

The v1 `Colors` export is removed, from both `src/theme/colors.ts` and the
`src/theme/index.ts` barrel. It has no correct meaning once there are two schemes, and
leaving it would let a component silently opt out of theming. The barrel instead
exports `Schemes`, `makeThemedStyles`, and the `Scheme` / `ThemeColors` types.

### 4.2 Runtime consumption

One new module, `src/theme/themed.ts`:

```ts
export function makeThemedStyles<T extends NamedStyles<T>>(
  factory: (c: ThemeColors) => T,
): () => T {
  const sheets = {
    light: StyleSheet.create(factory(Schemes.light)),
    dark: StyleSheet.create(factory(Schemes.dark)),
  };
  return function useStyles() {
    return sheets[useColorScheme() ?? 'light'];
  };
}
```

Both sheets are built **once, at module import**. The hook is an object lookup; it
allocates nothing per render and does no work on scheme change beyond returning a
different frozen object.

Why this over the alternatives:

| Approach | Rejected because |
|---|---|
| `useTheme()` context + `useMemo` per component | Allocates on every scheme change, pushes style construction under an enabled React Compiler, and its one real advantage — sourcing the scheme from somewhere other than the OS — is unused given the no-toggle decision. |
| `DynamicColorIOS` / `PlatformColor` | Smallest diff by far and needs no re-render, but **iOS-only**, so Android would need the hook approach anyway. It also stops tokens being hex strings, which breaks the contrast tests, the dot-tile generator, and `app.json`. |

`useColorScheme()` from `react-native` is the hook Expo's colour-themes guide
recommends. It returns `null` when the appearance is unknown; `?? 'light'` makes that
fall back to the shipped theme. jest-expo also returns `null`, which is why every
existing test keeps passing without modification.

### 4.3 Per-file change shape

The edit is mechanical. Before:

```ts
const styles = StyleSheet.create({ card: { backgroundColor: Colors.surface.card } });
```

After:

```ts
const useStyles = makeThemedStyles((c) => ({ card: { backgroundColor: c.surface.card } }));
// inside the component:
const styles = useStyles();
```

**Files requiring the change (14).** Counts are `Colors.` usages, `in-sheet` /
`inline`:

| File | In sheet | Inline | Note |
|---|---|---|---|
| `src/app/_layout.tsx` | 1 | 1 | inline one is the `Stack` `contentStyle` |
| `src/app/note/[id].tsx` | 8 | 2 | |
| `src/app/(tabs)/search.tsx` | 4 | 1 | |
| `src/components/kraft/confirm-dialog.tsx` | 8 | 0 | |
| `src/components/kraft/note-card.tsx` | 8 | 0 | |
| `src/components/kraft/error-screen.tsx` | 5 | 0 | |
| `src/components/kraft/cover-header.tsx` | 3 | 0 | |
| `src/components/kraft/undo-bar.tsx` | 3 | 0 | |
| `src/components/kraft/tab-bar.tsx` | 2 | 1 | |
| `src/components/kraft/empty-state.tsx` | 2 | 0 | |
| `src/components/kraft/fab.tsx` | 2 | 0 | |
| `src/components/kraft/paper.tsx` | 1 | 0 | also picks the tile, §7 |
| `src/components/kraft/stamp.tsx` | 0 | 1 | sheet has no colours; only the hook call is new |
| `src/components/kraft/category-square.tsx` | 0 | 0 | new: per-scheme category colour, §6 |

`src/app/(tabs)/index.tsx` imports only `Layout` and **needs no change**, despite
having a `StyleSheet.create`. It is listed here so its absence is not read as an
oversight.

Two call sites need care rather than a blind wrap:

- **`_layout.tsx`** resolves `contentStyle` for the `Stack` and a `ground` background.
  Both must come from the hook, so the paper ground behind `SQLiteProvider` is dark on a
  dark device rather than flashing cream.
- **`error-screen.tsx`** renders when the database fails to open. It sits inside the
  React tree but outside `SQLiteProvider`, so the hook is available; no special casing.

## 5. The Lamplight palette

Chosen from three rendered directions. The brief in v1 §1 — "old-fashioned, warm,
stylish, with the user feeling at home" — makes warmth load-bearing, and Lamplight is
the direction that carries it into the dark: the same notebook under a warm desk lamp,
every hue kept and only the value dropped.

The roles invert cleanly. Today's *paper* cream becomes tomorrow's *ink*.

| Role | Light | Lamplight |
|---|---|---|
| `surface.cover` | `#B08A57` | `#6B5335` |
| `surface.page` | `#EDE3CE` | `#1E1912` |
| `surface.card` | `#F7F0E1` | `#2A2219` |
| `text.primary` | `#22303F` | `#EDE3CE` |
| `text.secondary` | `#8A7C64` | `#A2957C` |
| `text.onKraft` | `#FBF5E9` | `#F5EDDD` |
| `accent` / `marginRule` | `#9C4A33` | `#D4785A` |
| `border.hairline` | `#D6C8AC` | `#3A3125` |
| `border.card` | `#E0D4B9` | `#3B3023` |
| `highlight` | `#F5E27F` | `#6E5A1C` |

The dark accent is `#D4785A`, not the `#C96A4C` shown in the mockup — see §6.

## 6. Contrast, and what it forced

Checking the palette against WCAG surfaced two failures. Both are fixed by nudging
hexes far too little to see, which is a better trade than shipping known-illegible UI.

| Pair | At mockup values | Fix | After |
|---|---|---|---|
| Selected tab label on card | `#C96A4C` on `#2A2219` ≈ **4.2:1**, under AA's 4.5:1 at 9px | accent → `#D4785A` | ≈4.9:1 |
| Teal category square on card | `#2F6C69` on `#2A2219` ≈ **2.6:1**, under the 3:1 for meaningful graphics | dark teal → `#3E8F8B` | ≈4.1:1 |
| Brick category square on card | `#9C4A33` on `#2A2219` ≈ **2.6:1** | dark brick → `#D4785A` | ≈4.9:1 |

Mustard `#D69B26` and sage `#A6AC8A` already clear 6:1 on the dark card and are
unchanged in both schemes.

Dark brick tracking the accent is not a collision to avoid — the two are *already* the
same colour in the light theme (`#9C4A33`), so keeping them equal in dark preserves an
existing relationship.

**These ratios are hand-computed and are not the source of truth.** The implementation
adds a contrast assertion to the test suite, and the test's numbers win. If a value
misses, adjust the hex until it passes rather than relaxing the threshold.

Consequently `src/theme/categories.ts` changes shape: `Category.color: string` becomes
per-scheme. `categoryById` keeps its signature; resolving the colour moves to the
component, which now calls the hook.

The dot grid is deliberately *low* contrast in both schemes — `#3A3125` on `#1E1912` is
≈1.4:1, matching light's `#D6C8AC` on `#EDE3CE` at ≈1.3:1. It is texture, not
information, and must not be assertive.

## 7. The dot-grid tile

`scripts/make-dot-tile.mjs` hardcodes the dot colour at line 14 (`DOT = [0xd6, 0xc8,
0xac]`) and bakes it into three PNGs. The script gains a variant loop and emits a second
set — `dot-grid-dark.png`, `@2x`, `@3x` — in `#3A3125`. `Paper` selects the source by
scheme.

`tintColor` on `ImageBackground` was considered and rejected: the tile is RGBA with a
deliberately feathered alpha edge, and tint behaviour over partial alpha is inconsistent
across platforms. Six small PNGs are cheaper than that risk.

Both `require()` calls must be static literals — Metro resolves them at build time — so
`Paper` selects between two constants rather than interpolating a filename.

## 8. Native configuration

| Key | Change |
|---|---|
| `expo.userInterfaceStyle` | `"light"` → `"automatic"` |
| `expo-splash-screen` plugin | add `dark: { backgroundColor: "#1E1912", image: "./assets/images/splash-icon.png" }` |
| `expo.android.adaptiveIcon.backgroundColor` | **unchanged** — an app icon should not follow the system theme |

Verified against the v57 docs: `dark: { image, backgroundColor }` is a documented
splash-plugin key, and `userInterfaceStyle` accepts `light | dark | automatic`. Android
requires `expo-system-ui` for `userInterfaceStyle` to be honoured; it is already a
dependency at `~57.0.3`, so nothing is installed.

`<StatusBar style="light" />` at `src/app/_layout.tsx:60` **stays as written**. It sits
over the kraft cover header, which is dark enough for light content in both schemes
(`#B08A57` and `#6B5335`). This is called out because it looks like an oversight and is
not one.

## 9. Testing

`src/lib/theme-tokens.test.ts` currently asserts `'there is no dark variant'` at line
38. That guard is retired deliberately, and replaced by a stronger set:

1. **Light is unchanged** — every light role equals its shipped v1 value, literally.
   This is the guard for §3's non-negotiable constraint.
2. **Both schemes are complete** — `Schemes.light` and `Schemes.dark` expose an
   identical set of role keys, recursively. Prevents a half-themed component.
3. **Every value is an uppercase 6-digit hex** — extended to both schemes and to both
   category colour sets.
4. **Contrast** — a small pure `contrastRatio(a, b)` helper in `src/lib/`, table-driven
   assertions for every text-on-surface and graphic-on-surface pair in §6, at 4.5:1 for
   text and 3:1 for graphics. This is the source of truth for §6.
5. **`makeThemedStyles`** — returns distinct objects per scheme, builds each sheet
   exactly once regardless of how many times the hook is called, and falls back to light
   when `useColorScheme()` returns `null`.
6. **Dark render tests** — `useColorScheme` mocked to `'dark'`, asserting a
   representative component resolves dark surfaces. Kept deliberately few; this is a
   guard against unthemed components, not a snapshot of appearance.

TDD applies to items 1–5, which are pure. Item 6 is written after.

**All 163 existing tests must stay green throughout**, without modification except to
`theme-tokens.test.ts`. Any other test needing a change is a signal that the refactor
altered behaviour it should not have.

## 10. The device pass

The app has never run on hardware or a simulator — every bug in the v1 plan's
"fixed during execution" list was found by running it, not by testing it. This is the
step that catches that class of defect.

`npx expo start --ios` in Expo Go, across the available iPhone runtimes:

- All four screens — list, editor, search, and the migration error screen — in both
  appearances.
- **Appearance toggled mid-session**, which is the case the refactor is most likely to
  get wrong.
- Cold launch in dark, checking the splash and the pre-database ground for a cream
  flash.
- Autosave, delete-with-undo, pin, category and search, to confirm the refactor changed
  nothing behavioural.

**Triage rule:** defects that are dark-mode or theming defects are fixed in this work.
Anything else found on device is written down and filed, not fixed inline. Scope creep
during a verification pass is how a two-day change becomes a two-week one.

## 11. Risks

| Risk | Mitigation |
|---|---|
| A component is missed and stays light-only | Test 2 catches missing *tokens*; a missed *component* is caught by a lint-style grep for `Schemes.` / removed `Colors` imports, plus the device pass. Removing the v1 `Colors` export turns a miss into a compile error. |
| Light theme drifts during a 14-file refactor | Test 1 asserts every light value literally. |
| Expo Go honours appearance differently from a dev build | Accepted. Expo Go is the verification floor chosen for this spec; a dev-build pass rides along with the deferred font-plugin work. |
| Category shape change ripples further than expected | `categoryById` keeps its signature; only colour resolution moves. `notes.category` in SQLite is untouched — **no data migration**. |

## 12. Deferred, in order of likely value

1. `expo-font` config plugin, with a dev build.
2. Android verification — the bundled-font risk lives there.
3. A manual Auto / Light / Dark override, if the system-only default proves wrong.
4. Everything still open from v1 §10: FTS5, export and share.
