# Note Taker — Design Spec

**Date:** 2026-09-09
**Status:** Approved (visual direction), pending review of this spec
**Visual direction:** Kraft & Ink — see `docs/design/note-taker-design-directions.pdf`, p. 02

## 1. Purpose

A local-first note-taking app for iOS and Android, built on the existing Expo SDK 57
template. The product goal is a note app that feels like a physical pocket notebook:
warm, unprecious, fast to write in.

The design goal is more specific: **old-fashioned, warm, stylish, slightly modern**,
with the user feeling "at home". Kraft & Ink delivers this through kraft-paper chrome,
dot-grid paper, a typewriter body face, and a geometric sans for UI furniture.

## 2. Assumptions

The following were not settled during brainstorming. Work proceeds on these
assumptions; each is cheap to revisit before implementation starts.

| # | Assumption | Impact if wrong |
|---|---|---|
| A1 | Notes are **mixed use** — quick capture is primary, but the editor must be comfortable for a few hundred words. Body is a single plain-text field. | If the app is long-form-only, the editor needs a distraction-free mode and richer typography. If capture-only, the editor simplifies further. Either is a contained change to one screen. |
| A2 | **iOS and Android are the targets.** Web must continue to build (the template supports it) but is not visually tuned. | Tuning web is additive; nothing needs undoing. |
| A3 | **No dark mode in v1.** The theme is built on warm paper tones. | Adding it later means authoring a second palette; the token layer (§5) is structured so this is possible without touching components. |
| A4 | **No accounts, sync or cloud.** All data is local SQLite. | Sync would require a server and a rework of the data layer. Explicitly out of scope. |

## 3. Scope

### In scope for v1

1. **Notes list** — kraft cover header, dot-grid paper, raised note cards; pinned notes first, then most-recently-updated.
2. **Editor** — title + plain-text body, autosave, live word count, red margin rule.
3. **Create / delete** — delete behind a confirmation, with undo.
4. **Pin / unpin** a note.
5. **Categories** — one optional category per note from a fixed set of four, shown as a colour-coded square.
6. **Search** — case-insensitive substring match across title and body.
7. **Kraft & Ink theme system** — tokens, bundled fonts, reusable primitives.

### Out of scope for v1

Rich text or Markdown rendering, folders, free-form tags, attachments or images,
export or sharing, reminders and notifications, sync or accounts, dark mode,
note history or versioning, full-text search ranking.

Two are called out because they are *deliberate* deferrals, not oversights:

- **FTS5 full-text search.** `expo-sqlite` supports it, but `LIKE` is correct and
  simpler at the note counts a personal notes app reaches. §6 notes the migration path.
- **The third tab.** The mockup showed Notes / Recent / Find. "Recent" is redundant
  with a list already sorted by `updated_at`, so v1 ships **two** tabs: Notes and Find.

## 4. Architecture

### 4.1 Constraints from the existing template

Two template decisions must change:

- **`NativeTabs` must go.** `src/components/app-tabs.tsx` uses
  `expo-router/unstable-native-tabs`, which renders the platform's native tab bar.
  It exposes only `backgroundColor`, `indicatorColor` and `labelStyle`, which cannot
  produce a kraft bar with a bundled font and brick-red selected state. It is replaced
  by a custom JS tab bar over `expo-router`'s `Tabs`.
- **`Colors.light` / `Colors.dark` in `src/constants/theme.ts` is the wrong shape.**
  It assumes a light/dark pair. Kraft & Ink is a single named palette with semantic
  roles. A new token module supersedes it; the old export is removed once no component
  imports it.

Everything else in the template is kept: the `src/` layout, the `@/*` path alias,
`expo-router` file routing, typed routes, the React Compiler experiment, and the
existing splash screen coordination in `src/app/_layout.tsx`.

### 4.2 Layer boundaries

Four layers, each independently understandable and testable:

```
theme/      pure data — colours, spacing, type scale, category definitions
              no imports from anything below
db/         SQLite access — schema migrations + one module of note queries
              knows nothing about React
hooks/      React state over db/ — subscription, autosave, mutation
              knows nothing about visual design
components/ + app/   presentation — consumes theme/ and hooks/
              contains no SQL and no date arithmetic
```

The rule that keeps this honest: **no SQL outside `src/db/`, and no colour literals
outside `src/theme/`.** Both are mechanically checkable.

### 4.3 File layout

```
src/
  app/
    _layout.tsx              fonts + SQLiteProvider + splash coordination
    (tabs)/
      _layout.tsx            Tabs with the custom kraft tab bar
      index.tsx              notes list
      search.tsx             search
    note/[id].tsx            editor; id === 'new' creates
  theme/
    colors.ts                Kraft & Ink palette + semantic roles
    typography.ts            font families, type scale, text styles
    layout.ts                spacing, radii, hairline widths
    categories.ts            the four categories and their colours
    index.ts                 barrel re-export
  db/
    migrations.ts            versioned schema via PRAGMA user_version
    notes.ts                 all note queries
    types.ts                 Note row type
  hooks/
    use-notes.ts             list + search subscription
    use-note.ts              single note load
    use-autosave.ts          debounced save
  components/kraft/
    paper.tsx                dot-grid background
    cover-header.tsx         kraft header with stamp
    note-card.tsx
    category-square.tsx
    stamp.tsx
    fab.tsx
    tab-bar.tsx
    empty-state.tsx
    confirm-dialog.tsx       delete confirmation
    undo-bar.tsx             transient undo affordance
  lib/
    format-date.ts           "TODAY 14:32" / "MON 08:15" / "12 AUG"
```

### 4.4 Data flow

```
SQLite ──> db/notes.ts ──> hooks/use-notes.ts ──> list screen
                     ^                              │
                     │                              v
              use-autosave <── editor screen <── note/[id].tsx
```

Writes go through `db/notes.ts` and then bump a store version, which re-runs the
list query. There is no client-side cache to invalidate: SQLite *is* the cache, and
queries are fast enough at this scale that re-reading on change is simpler and
strictly more correct than diffing in memory.

## 5. Theme system

### 5.1 Palette

The six Kraft & Ink colours, plus the borrowed category accents:

```ts
kraft:  '#B08A57'   // cover / chrome
paper:  '#EDE3CE'   // page background
card:   '#F7F0E1'   // raised note card
ink:    '#22303F'   // primary text
brick:  '#9C4A33'   // single accent: FAB, selected tab, pinned
dim:    '#8A7C64'   // secondary text
rule:   '#D6C8AC'   // dot grid, hairlines
```

Exposed as **semantic roles**, not raw names, so components never reference a colour
by appearance:

```ts
text.primary → ink        surface.page → paper       accent → brick
text.onKraft → #FBF5E9    surface.card → card        border.hairline → rule
text.secondary → dim      surface.cover → kraft
```

This indirection is what makes A3 (dark mode later) a palette change rather than a
component rewrite.

### 5.2 Typography

Futura and Courier ship with iOS but not Android, so both faces are bundled for a
consistent result:

| Role | Face | Package | Weights |
|---|---|---|---|
| Chrome — titles, labels, tabs | **Jost** (geometric sans, Futura-adjacent) | `@expo-google-fonts/jost` | 400, 500 |
| Body — note text, dates, metadata | **Courier Prime** (typewriter) | `@expo-google-fonts/courier-prime` | 400, 700 |

Loaded at runtime with `useFonts` from `expo-font`, coordinated with the splash
screen already present in `src/app/_layout.tsx`. Runtime loading is chosen over the
`expo-font` config plugin because it works in Expo Go and needs no prebuild; the
config plugin is a later optimisation, noted in §9.

Type scale (chrome in Jost, body in Courier Prime), with letter-spacing carrying much
of the period character:

```
coverTitle    20 / 500 / +0.2    screenTitle  17 / 500
stampLabel     7 / 500 / +1.4    cardTitle    11.5 / 500
tabLabel       7 / 500 / +0.9    metaLabel      7 / 400 / +0.8  (Courier)
bodyText      10 / 400 / lh 1.85 (Courier)
```

### 5.3 Categories

Four fixed categories. The colours are the mid-century squares borrowed into the
kraft palette, as approved:

```ts
lists  → mustard #D69B26
home   → teal    #2F6C69
ideas  → brick   #9C4A33
notes  → sage    #A6AC8A
```

A note's category is optional (`null` renders no square).

### 5.4 Motion

Deliberately restrained, and *not* the template's glass/liquid idiom:
`expo-glass-effect` and `expo-symbols` go unused, since blur and SF Symbols are the
modern tells that would break the aesthetic. Press states are a fast opacity/scale
tap (~120ms, `react-native-reanimated`, already a dependency). No shared-element
transitions, no parallax.

## 6. Data model

```sql
CREATE TABLE notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL DEFAULT '',
  body       TEXT    NOT NULL DEFAULT '',
  category   TEXT             DEFAULT NULL,   -- 'lists'|'home'|'ideas'|'notes'|NULL
  pinned     INTEGER NOT NULL DEFAULT 0,      -- 0|1
  created_at INTEGER NOT NULL,                -- epoch ms
  updated_at INTEGER NOT NULL,                -- epoch ms
  deleted_at INTEGER          DEFAULT NULL    -- soft delete, enables undo
);

CREATE INDEX idx_notes_active ON notes(deleted_at, pinned DESC, updated_at DESC);
```

Decisions worth recording:

- **Soft delete.** `deleted_at` exists so undo is a single `UPDATE`, not a re-insert
  that would lose the id. Deleted rows are purged after 30 days on app start.
- **Epoch milliseconds, not ISO strings.** Integer comparison sorts correctly in the
  index and avoids timezone parsing in the list query.
- **Title and body are separate columns**, not a single blob split at the first
  newline. The list needs the title cheaply, and an untitled note must be able to have
  a body.
- **Migrations** use `PRAGMA user_version` with WAL mode, per the SDK 57 docs. Version 1
  creates the table above; every later change appends a numbered block and never edits
  an existing one.

`notes.ts` exposes exactly: `listNotes`, `searchNotes`, `getNote`, `createNote`,
`updateNote`, `setPinned`, `setCategory`, `softDelete`, `restore`, `purgeOldDeleted`.

Search is `WHERE deleted_at IS NULL AND (title LIKE ?1 OR body LIKE ?1)` with a
`%q%` parameter, bound — never interpolated. If note counts ever make this slow, the
migration path is an FTS5 virtual table synced by trigger, which changes only
`searchNotes`.

## 7. Screens

### 7.1 Notes list — `(tabs)/index.tsx`

Kraft cover header (`NO. 014 · FIELD` stamp, "Notebook", `14 entries · all saved`)
over dot-grid paper. Cards show title, a two-line body excerpt, a category square, a
relative date in Courier, and a `PINNED` chip in brick where applicable. Brick circular
FAB, bottom right. Ordering: pinned first, then `updated_at` descending.

Empty state: a stamped "NO ENTRIES YET" block on the dot grid with a single prompt to
write the first note — in the aesthetic, not a generic illustration.

### 7.2 Editor — `note/[id].tsx`

Kraft bar with a back affordance and a live `SAVED ✓` / `SAVING…` indicator. Title
input in Jost; body in Courier Prime at 1.85 line-height against the dot grid, with
the borrowed **red margin rule** down the left edge. Metadata line shows date and word
count. Overflow menu: pin, set category, delete.

Autosave: debounced 600ms after the last keystroke, plus a forced flush on blur and on
navigating away. A note is created on first keystroke, not on screen open, so opening
the editor and backing out leaves no empty row.

### 7.3 Search — `(tabs)/search.tsx`

Sunken Courier search field on kraft, results using the same `NoteCard`, with the
matched substring highlighted. Empty query shows recent notes; no matches shows a
stamped "NOTHING FILED UNDER…" state.

## 8. Error handling

The app is local and offline, so the realistic failure set is small and each case gets
a defined behaviour rather than a generic alert:

| Failure | Behaviour |
|---|---|
| Migration fails on launch | Blocking kraft-styled error screen with the error text and a retry. Never silently continue on an unknown schema. |
| Font loading fails | Render anyway with platform fallbacks (`Futura`/`Courier New` on iOS, system on Android). `useFonts` returns an error; the app must not hang on the splash screen. Degraded looks acceptable; a stuck launch does not. |
| Autosave write fails | Indicator switches to `UNSAVED` in brick, editor keeps the text in state, retry on next keystroke or blur. Never discard user input. |
| Note id in the route does not exist | Redirect to the list rather than rendering an empty editor. |
| Empty note on exit (no title, no body) | Delete the row outright. No undo entry — there is nothing to restore. |

## 9. Testing

The template ships no test setup, so v1 adds `jest-expo` with
`@testing-library/react-native`.

What gets tested, in the order the logic is worth testing:

1. **`lib/format-date.ts`** — pure, boundary-heavy (today vs this-week vs older,
   midnight rollover). Table-driven tests against a fixed clock.
2. **`db/notes.ts`** — against a real in-memory SQLite database, not a mock: ordering
   with pinned notes, soft delete excluded from lists, restore, search matching
   title-only and body-only, `%` and `_` in a query treated literally, purge threshold.
3. **`db/migrations.ts`** — a fresh database reaches the current `user_version`, and
   running migrations twice is a no-op.
4. **`hooks/use-autosave.ts`** — debounce coalesces bursts into one write, blur forces
   a flush, failure keeps state and retries.
5. **Screens** — one render test each asserting the note title reaches the screen.
   Deliberately shallow; layout is verified by eye against the PDF, not by snapshot.

TDD applies to items 1–4, which are all pure or near-pure. Item 5 is written after.

## 10. Deferred work

- `expo-font` config plugin for build-time font embedding (needs a dev build).
- FTS5 search if `LIKE` becomes slow.
- Dark mode, via a second palette behind the §5.1 semantic roles.
- Export and share, which is the most likely first post-v1 request.
