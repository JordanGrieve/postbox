---
name: project-structure
description: Where every kind of file goes in this repo. Use before creating any new file — route, API handler, helper, component, stylesheet, or test — so new code lands where the existing code already is.
---

# Postbox project structure

Put new files where the same kind of file already lives. When unsure, find the
closest existing feature and mirror it. Never invent a new top-level directory.

## The map

| Kind of code | Where it goes |
| --- | --- |
| Signed-in screen | `app/(dashboard)/<feature>/page.tsx` |
| Operator console screen | `app/(admin)/admin/...` |
| Legal page | `app/(legal)/<name>/page.tsx` |
| Marketing / public page | `app/<name>/page.tsx` (e.g. `pricing`, `contact`) |
| HTTP API endpoint | `app/api/<resource>/route.ts` (nested: `app/api/tickets/[id]/status/route.ts`) |
| Cron endpoint | `app/api/cron/<job>/route.ts` |
| Webhook receiver | `app/api/webhooks/<provider>/route.ts` |
| Server actions for a page | `actions.ts` colocated next to that `page.tsx` |
| Data reads for a page | `queries.ts` colocated next to that `page.tsx` |
| Domain / business logic | `lib/<concern>.ts` — one concern per file, kebab-case (`campaign-send.ts`, `auto-reply-guards.ts`) |
| Database schema | `db/schema.ts` only; migrations in `db/migrations/` |
| DB access setup / guards | `db/` (`index.ts`, `guard.ts`, `env.ts`) |
| Shared UI component | `components/` — feature subfolder if one exists (`mail/`, `marketing/`, `newsletter/`, `skeletons/`) |
| Page-specific component | Colocated in that route's folder, not `components/` |
| Stylesheet | Colocated with its feature (`app/settings.css`, `forms/forms.css`); tokens only — see STYLE-GUIDE.md |
| Test | `tests/<name>.test.ts(x)` — flat, named after the thing under test; stubs in `tests/stubs/` |
| CI / workflows | `.github/workflows/` |

## Rules

- **Every new route that waits gets a `loading.tsx`** skeleton beside its
  `page.tsx` (`tests/skeletons.test.tsx` fails without it) and an entry in the
  matching render harness (`tests/*-views-render.test.tsx`). A prerendered
  public page is the exception: it gets NO boundary above it and goes in
  `STATIC_ROUTES` in that test (STYLE-GUIDE.md §6). There is no root
  `app/loading.tsx`; the (dashboard) and (admin) layouts wait inside their own
  Suspense with `AppGround`.
- **Middleware is `proxy.ts` at the repo root** — Next 16 renamed the
  `middleware.ts` convention to `proxy.ts`. There is exactly one, and no
  `middleware/` folder. It does only the Clerk page gate and its public-route
  list (`tests/public-routes.test.ts` guards that list). A new public page
  needs a line there or it 307s to /sign-in.
- **`/api/(.*)` is public in `proxy.ts`, so every `route.ts` enforces its own
  auth** — a signed-in check, a webhook signature, or the cron secret — before
  doing any work. Request guards live in `lib/` (`rate-limit.ts`,
  `auto-reply-guards.ts`) and `db/guard.ts`, not in `proxy.ts`.
- **`lib/` and `components/` do not import from `app/`.** Dependencies point
  one way: `app/` → `components/` → `lib/` → `db/`. The two known breaks were
  fixed on 21 Nov 2026: the mail components' `ContactNoteDTO` and `InboxView`
  types moved to `components/mail/types.ts`, and the audit-time formatters the
  client's Access log shared with the operator console moved to
  `lib/utc-time.ts`. A type or helper two route groups share belongs in
  `lib/` (or beside the components that use it), never in one route's folder.
  One cross-group import remains by design: the dashboard layout renders
  `app/(admin)/ImpersonationBanner.tsx`.
- **Page-level data reads check their own auth.** A layout's `requireAdmin()`
  or sign-in check does not protect the page under it (layouts are skipped on
  client navigation). Call the guard in the page, or in the query itself.
- **API handlers stay thin.** Validation and the real work belong in a
  `lib/` module the handler calls; the `route.ts` parses, authorizes,
  delegates, and shapes the response.
- **One concern per `lib/` file.** If a file needs a second noun in its name
  to describe what you're adding, it's a new file.
- **A change to the inbox, conversation, sidebar or composer also updates
  the homepage's product shots** (`components/marketing/ProductShot.tsx`,
  `FeatureBento.tsx`) in the same piece of work — STYLE-GUIDE.md, "The
  marketing product shots".
- **Components never contain colours or px font-sizes** — tokens and rem
  only (STYLE-GUIDE.md; CI enforces both).
