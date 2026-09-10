# App Store listing copy — Junior - Notes

Draft. Every field below is required by App Store Connect unless marked
optional. Character limits are Apple's and are enforced at submission.

## Name (30 char limit)

    Junior - Notes

Length: 14. Home-screen label is "Junior" (set via CFBundleDisplayName,
because iOS truncates icon labels at roughly 12 characters).

## Subtitle (30 char limit)

    A notebook for your pocket

Verified 26/30. Alternatives, all verified to fit:

    Your pocket notebook          (20)
    Notes, on paper you can keep  (28)

Rejected: "A pocket notebook for your phone" is 32 — two over the limit.

## Promotional text (170 char limit, changeable without a new build)

    No account, no sync, no ads. Your notes live on your phone and nowhere
    else — in a notebook that looks like paper instead of a spreadsheet.

## Description (4000 char limit)

    Junior - Notes is a notebook for your phone that behaves like a notebook.

    Write a note in one tap. It saves as you type. That is the whole app.

    WHAT IT LOOKS LIKE
    Kraft paper, dot-grid pages and a typewriter face for your words. No
    grey chrome, no glassy panels, no blue links. It was designed to feel
    like the pocket notebook you already carry, not like an office tool.

    WHAT IT DOES
    - Write notes with a title and body. Everything autosaves.
    - Pin the notes you keep coming back to.
    - Sort notes into four categories, colour-coded at a glance.
    - Search every word you have written.
    - Delete with an undo, in case you did not mean it.

    WHAT IT DOES NOT DO
    - No account. There is nothing to sign up for.
    - No sync, no cloud, no server. Your notes are on your device.
    - No analytics, no tracking, no advertising.
    - No permissions. It never asks for your camera, contacts or location.

    It works with the internet switched off, and always will.

## Keywords (100 char limit, comma-separated, no spaces after commas)

    notes,notebook,notepad,jot,write,writing,journal,memo,offline,private,paper,list,todo,diary

Verified 91/100. That is one string with no line break and no spaces after
the commas — the newline above is only for reading. 9 characters spare.

## Category

    Primary:   Productivity
    Secondary: Utilities (optional)

## Age rating

    Expect 4+. No objectionable content, no web views, no user-generated
    content that is shared, no ads.

## URLs

    Support URL:        REQUIRED — must be a real, reachable page
    Marketing URL:      optional
    Privacy Policy URL: REQUIRED — publish docs/store/privacy-policy.md

A single GitHub Pages page can serve as both the support and privacy URL.

## App Privacy questionnaire

    Answer: "Data Not Collected" for every category.

This is accurate: all data is local SQLite, the app makes no network requests
and requests no permissions.

## Review notes (what to tell the reviewer)

    This app has no account and no login, so no demo credentials are needed.
    All data is stored locally on the device; the app makes no network
    requests and requests no permissions. To test: tap the + button, type a
    note, and navigate back — the note is saved automatically.

## Export compliance

    Already declared in app.json: ITSAppUsesNonExemptEncryption = false.
    Accurate — the app uses no encryption beyond what Apple provides.
