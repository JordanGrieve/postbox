---
name: reuse-first
description: Before writing any new helper, query, component, or utility — search for an existing one and use it. Use at the start of every implementation task in this repo.
---

# Reuse first

This repo already has ~100 modules in `lib/` and a component library under
`components/`. Most "new" helpers already exist under a name you didn't guess.
Writing a duplicate is worse than slow — two spellings of the same logic is
how the send path and the sweep path drift apart.

## Before writing new code

1. **Search by the domain noun, not the call you'd write.** This repo writes
   SQL in two styles (Drizzle builder AND raw ``sql`` templates), so searching
   for `insert(lists)` proves nothing. Search for the table or concept name:
   `Grep "list_subscribers"`, `Grep "suppression"`, `Grep "rate.?limit"`.
2. **Scan `lib/` filenames first** — they're kebab-case nouns
   (`email-quota.ts`, `hash-chain.ts`, `sheet-drag.ts`). `Glob lib/*.ts` and
   read the names before concluding something doesn't exist.
3. **For UI, check `components/` and the nearest route folder.** Buttons are
   `.stg-button` (globals.css) — never write a new button style. Skeletons
   have `components/skeletons/`. Mail UI pieces live in `components/mail/`.
4. **For validation / formatting / dates**, check `lib/serialize.ts`,
   `lib/ticket-format.ts`, `lib/email-typo.ts`, `lib/business-hours.ts`
   before adding any formatter.
5. **Constants over copies.** Cadence/config values have a single home
   (e.g. `SWEEP_CADENCE` in `lib/campaign-schedule.ts`). Reference the
   constant; never restate its value elsewhere, even in a comment.

## Known homes — use these, do not write another

| Need | Use | Not |
| --- | --- | --- |
| Escape text into HTML | `escapeHtml` in `lib/newsletter.ts` (the only copy since 21 Nov 2026; `lib/email.ts` imports it) | a private copy |
| Is this an email address | `looksLikeEmail` in `lib/email-address.ts` (pinned by `tests/email-address.test.ts`) | restating the pattern. `isValidEmail` in `lib/http.ts` delegates to it. `lib/contact-notes.ts` only checks for "@" on purpose: it normalises a lookup key, it does not validate |
| Postgres unique_violation | `isUniqueViolation` in `lib/pg-errors.ts` | reading `err.code` directly — drizzle wraps it, the code is on `err.cause` |
| Client IP for rate limits | `clientIp` in `lib/http.ts` | parsing `x-forwarded-for` yourself |
| Durable rate limit | `rateLimitDurable` in `lib/rate-limit-store.ts` | the in-memory `lib/rate-limit.ts` (it is the fallback) |
| Record a rejected public post | `recordIngestionFailure` / `recordInvalidKey` in `lib/ingestion-log.ts` | a new log table |
| Live (not trashed) tickets | `notDeleted` / `folderWhere` in `app/(dashboard)/queries.ts`; in raw SQL, `t.deleted_at IS NULL` | forgetting it in a count — badges must match their folder |
| Merge-field rendering | `renderTemplate` / `firstNameFrom` / `UNKNOWN_FIRST_NAME` in `lib/merge-tags.ts` (re-exported by `lib/newsletter.ts` and `lib/auto-reply.ts`) | a copy in either file — there were two until 21 Nov 2026 |
| Read a public form POST (JSON or form, never a 500) | `readFields` / `wantsHtml` / `isJsonRequest` in `lib/request-fields.ts` | a copy in a route. `app/api/subscribe-confirm` keeps a form-only reader on purpose |
| Show an audit timestamp | `formatDateTime` / `formatDate` / `formatDuration` in `lib/utc-time.ts` (absolute, UTC) | `lib/serialize.ts`'s `formatDateTime`, which is the RELATIVE local "Today, 9:24 AM" for threads — same name, different question |
| Signed-token encode/decode | `b64url` / `fromB64url` / `signBody` / `verifySignedBody` in `lib/signed-token.ts` (shared by `lib/subscribe.ts` and `lib/welcome.ts` since 21 Nov 2026) | copying `b64url`/`sign` again |
| Standalone HTML a customer sees | `lib/form-response-pages.ts` | inline HTML in a `route.ts` |
| Metadata for a public page (title, description, canonical, full share preview) | `pageMetadata` in `lib/page-metadata.ts` | a partial `openGraph` object — it replaces the root's whole one and drops the image |
| Structured data (JSON-LD) | `JsonLd` in `components/marketing/JsonLd.tsx` with builders in `lib/structured-data.ts` | another `dangerouslySetInnerHTML`; `JsonLd` is the one place it is escaped |
| The public site's call to action | `TRIAL_CTA` / `TRIAL_HREF` / `TRIAL_NOTE` in `lib/marketing-copy.ts` | a per-page button reading `OPEN_SIGNUP` |
| Public footer (who runs Postbox, contact) | `components/marketing/MarketingFooter.tsx`; the facts are `OPERATOR_*` and `PUBLIC_CONTACT_EMAIL` in `lib/config.ts` | a footer per page |
| Clean up an inbound email's text | `stripQuotedReply` then `unwrapHardWrappedText` in `lib/tickets.ts` (quoted history out, the client's ~72-column wrapping undone) | joining or splitting lines in a route |
| Which workspace an inbound address belongs to | `workspaceForInboundAddress` in `lib/inbound-address.ts` (routes hello@ to Postbox's own workspace) | calling `getWorkspaceByInboundEmail` directly from a route |
| A competitor's price, or "about £N" from dollars | `INBOX_RIVALS`, `teamMonthlyUsd`, `aboutGbp` and `COMPETITORS_CHECKED` in `lib/competitor-prices.ts` (the pricing page and the guides both read it) | typing a rival's price into a page or guide |
| Whether Postbox charges VAT | `VAT_REGISTERED` in `lib/pricing.ts` (false; `tests/pricing-comparison.test.tsx` fails if checkout adds tax) | writing "no VAT" or "+VAT" into copy directly |
| Keep a signed-in screen up to date | `useInboxLive` in `lib/use-inbox-live.ts` (asks `GET /api/inbox/live` for `inboxStamp`, refreshes only on a change, stops when idle) | a `setInterval` calling `router.refresh()`: that re-rendered the whole page every 30s and got postbox.help paused for using up Vercel's CPU allowance (24 Nov 2026) |
| A `<Link>` | always `prefetch={false}` (`tests/link-prefetch.test.ts`) | a bare `<Link>`: each one in view is a server render of its page, before anyone clicks |
| Can /contact deliver (key set AND its workspace exists) | `contactFormState` / `contactFormAlert` in `lib/forms.ts` (the admin overview and the daily health check both ask it) | `Boolean(POSTBOX_CONTACT_KEY)`: it stayed true while the key named a deleted workspace (25 Nov 2026) |
| Which conversation a reply belongs to when it has no ticket+ address | `findTicketByReferencedMessageIds` in `lib/data.ts` (In-Reply-To / References; one match or none) | matching on sender + subject, which a forged From could use |

## If a near-match exists

Prefer extending it (a parameter, an overload) over writing a sibling.
If the existing one is wrong, fix it where it lives — all callers get the
fix — rather than forking a corrected copy.

## If nothing exists

Only then write new code, in the location `project-structure` prescribes,
and give it the name you just searched for — so the next search finds it.
