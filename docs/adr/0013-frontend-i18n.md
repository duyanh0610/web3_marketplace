# ADR-0013: Frontend Internationalization

**Status:** Accepted

## Context

The frontend needs English and Vietnamese support from the start (added
during Milestone 1, retrofitted onto the RainbowKit `ConnectButton` +
`SignInButton` UI already in place). RainbowKit itself already
auto-localizes its own built-in components from `navigator.language`
(confirmed: it rendered "Kết nối Ví" with no app configuration at all) —
the gap is that everything *this project* renders (headings, sign-in flow
copy, error messages) had no translation mechanism.

## Decision

A hand-written **React Context + JSON dictionary** i18n layer
(`apps/frontend/src/shared/i18n/`), with:

- **No URL locale routing** (no `/en/`, `/vi/` path prefixes).
- **`localStorage`-persisted locale**, defaulting to browser-language
  detection (`navigator.language`), itself defaulting to English if
  neither localStorage nor the browser indicates Vietnamese.
- Type-safe translation keys: a TypeScript mapped/conditional type derives
  the full set of valid dot-paths (`"home.title"`, `"auth.signIn"`, ...)
  directly from `en.json`'s actual shape, so a typo in a translation key
  is a compile-time `tsc` error, not a silently-missing string — verified
  by deliberately introducing a typo and confirming `pnpm typecheck` fails
  with the full list of valid keys.
- RainbowKit's own `locale` prop is synced to this same state (`en`/`vi`,
  both natively supported by RainbowKit — no code mapping needed) so its
  built-in components and this project's own UI never show mismatched
  languages.

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| **next-intl** | The modern standard for Next.js App Router i18n (Server Component support, mature routing integration) — genuinely the stronger long-term choice, and what was recommended. Not chosen because the project owner explicitly opted for a hand-written Context instead, to avoid an additional dependency for what is currently a single page with a small, stable string set. Revisit this ADR (supersede, don't silently swap) if the UI grows enough that next-intl's server-side rendering/pluralization/ICU message format features become worth the dependency. |
| **next-i18next** | Built around the Pages Router model; awkward fit for this project's App Router structure. Not chosen. |
| **URL-based locale routing** (`/en/...`, `/vi/...`) | The SEO-standard approach, but this app's meaningful content sits behind wallet-connect/sign-in (see [Frontend Design](../06-frontend-design.md)), so search-engine indexing per locale isn't a real driver here. Would also have required restructuring `app/` into `app/[locale]/...` plus middleware, non-trivial churn for no corresponding benefit at this stage. |

## Decision Drivers

- Zero new runtime dependency for what is currently a handful of strings
  across one page and one feature (`features/auth`).
- Type-safe keys were a specific, deliberate design choice (not free with
  a naive `Record<string, string>` dictionary) — worth the small amount of
  mapped-type complexity because a missing/mistyped translation key
  failing silently at runtime (falls back to showing the raw key) is
  exactly the kind of bug that's invisible until a reviewer switches
  languages.
- Not routing by URL keeps the existing `app/` structure (and every route
  planned in later milestones — `/mint`, `/listing/[id]`, `/profile/[address]`)
  untouched; locale is purely a client-side rendering concern here.

## Consequences

- Every new user-facing string added in future milestones must go into
  **both** `locales/en.json` and `locales/vi.json` — a string added to only
  one language falls back to rendering the raw dot-path key in the other
  (by design — visible/obvious in review, not a silent blank).
- Backend-originated error text (SIWE verification failures, domain error
  messages) is **not** translated — those pass through as-is in whatever
  language the backend returns them in (English). Full localization would
  require plumbing the backend's stable `code` fields (see
  [Backend Design §8](../05-backend-design.md)) through to the frontend as
  translation keys — reasonable future work, out of scope for this pass.
- Static `<head>` metadata (page `<title>`/`<meta description>` in
  `app/layout.tsx`) is intentionally **not** wired to this client-side
  locale system — Next.js metadata is generated server-side before any
  client-side locale detection runs, and making it locale-aware without
  URL-based routing would require reading a cookie server-side, a bigger
  change deferred unless SEO across locales becomes a real requirement
  (see the URL-routing alternative above).
