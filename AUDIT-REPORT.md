# Skills baseline audit — 20 Nov 2026

Branch `audit/skills-baseline`, cut from `main` at `f6f28e4`. Nothing pushed or
merged. Every fix is its own commit, with a test that was confirmed to go red
when the fix is reverted.

Where a skill and the project disagreed, the project won: the accessibility bar
is WCAG 2.2 **AAA** (STYLE-GUIDE.md), not the skills' AA, and the project's own
probes (`tests/audit-probes.js`) were run alongside axe.

## Baseline checks

| Check | Before | After |
| --- | --- | --- |
| `npm run typecheck` | ✅ pass | ✅ pass |
| `npm run lint` | ✅ 0 errors, 2 warnings | ✅ 0 errors, the same 2 warnings |
| `npm test` | ✅ 122 files, 1734 passed, 1 expected fail | ✅ 131 files, 1774 passed, 1 expected fail |
| `npm run build` | ✅ pass | ✅ pass |
| `npm audit --omit=dev` | ❌ 7 moderate | ❌ 5 moderate (see Not fixed) |
| `npm audit` (incl. dev) | ❌ 15 moderate, 2 high | ❌ 5 moderate, 1 high (see Not fixed) |

The two lint warnings are `window.location.assign()` in
`app/(dashboard)/newsletters/Composer.tsx:1060,1067` (nit, below).

## Fixed

| Sev | Finding | Commit |
| --- | --- | --- |
| Critical | Newsletter sign-off lost every letter "s": `/s+/` for `/\s+/` in `app/api/workspace/route.ts:89`. "Best wishes" was saved and sent as "Be t wi he ". Moved to `normalizeSignOff` in `lib/newsletter.ts`. A grep that provably catches the pattern found no other lost-backslash regex. **Already-saved sign-offs stay damaged; affected clients must re-enter theirs.** | `b09a135` |
| Important | Operator console page had no admin check of its own; it relied on the `(admin)` layout, which Next skips on client navigation. | `5a93f99` |
| Important | No security headers anywhere: console and settings were frameable (clickjacking). Added `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`, `nosniff`, `Referrer-Policy`. SAMEORIGIN so the audit runner still works. | `ed360a7` |
| Important | "Change plan" opened a second Stripe subscription: billed twice, and cancelling one dropped the workspace to trial. Checkout now returns 409 pointing at Manage billing when a subscription is live. | `66ab38a` |
| Important | Hash-chain retry never ran: `isUniqueViolation` read `err.code`, but drizzle puts it on `err.cause`. Two operators acting at once got an exception. One shared copy in `lib/pg-errors.ts`. | `2c465cd` |
| Important | Label badges (and search's label count) counted trashed tickets, so "Refund 3" opened a folder of 2. | `39886aa` |
| Important | Unknown keys on `/api/tickets/[id]` and `/api/subscribe/[key]` wrote an `ingestion_failures` row per request with no throttle (`cli_<random12>`). Now at most 10 per IP per minute; the 401 is unchanged. | `dcbe59b` |
| Important | Onboarding "Do it" button ran 20px past its card on phones (`width:100%` + `margin-left:32px`). New guard scans every stylesheet for the pattern. | `69d695b` |
| Important | Contact form's no-JS success/error pages failed AAA: no `lang`, ~4.8:1 body text, px sizes, old terracotta. Moved to `lib/form-response-pages.ts`; checked in the browser. | `fb1360e` |
| Important | `ci.yml` had no `permissions:`, so it ran with the default token scope. Now `contents: read`, guarded for every workflow. | `191c88d` |
| Important | `npm audit fix` (non-breaking, lockfile only): 17 → 6 overall, 7 → 5 production. | `b67ed77` |

## Not fixed

### Needs your decision

| Sev | Finding | The decision |
| --- | --- | --- |
| Important | An operator starting checkout inside a client workspace creates the client's Stripe customer with the **operator's** email (`app/api/billing/checkout/route.ts:82`), so receipts and dunning go to Postbox staff. Operators can also open the client's billing portal and cancel. | Should operators be blocked from billing while impersonating, or should checkout use the workspace owner's email? |
| Important | The admin-action hash chain is written on every action but **never verified**: `verifyAdminActionLog` and `describeAdminChain` have no callers. The impersonation chain is verified. | Where should verification surface: the console, or the daily health job? |
| Maybe | Operator replies, campaign sends and settings changes made while impersonating are not recorded as admin actions (only exports are). | Intended "full experience", or should sends be attributed or blocked? |
| Maybe | Search returns trashed tickets, and links them to `?folder=all` where they don't appear. Contact ticket counts include trashed tickets too. | Should search and contact counts exclude Trash like every folder does? |
| Nit | Any team member can invite; only the owner can remove (`lib/team.ts` `checkInvite` vs `checkRevoke`). A member about to be removed can invite a second address. | Owner-only invites? |

### Left for later (judgement or larger change)

| Sev | Finding | Why not now |
| --- | --- | --- |
| Moderate | `npm audit`: glob/minimatch via `@sentry/nextjs`'s build plugin (build-time only); happy-dom high (test-only, parses only our fixtures). | Both need breaking upgrades (`--force`). Do them as deliberate bumps. |
| Maybe | Stripe webhook applies any subscription event to the workspace in its metadata without comparing subscription ids. | With no second subscription reachable from the product (fix above), this is hardening. |
| Maybe | Inbound de-duplication by Message-ID is global (`app/api/inbound/route.ts:95`), so one tenant's copy of a CC'd email could be dropped. | Couldn't confirm how Resend delivers one message to two Postbox recipients. |
| Maybe | URLs with tokens (`/s/confirm?t=`, `/u/<token>`, `?key=` after rotation) may reach Sentry traces. | Couldn't confirm what the SDK sends; a `beforeSendTransaction` scrubber is the fix. |
| Maybe | `lib/http.ts` trusts the leftmost `X-Forwarded-For`; fine on Vercel, spoofable elsewhere. | Not verified that Vercel overwrites it; prefer `x-vercel-forwarded-for`. |
| Maybe | Welcome unsubscribe token decoder (`lib/welcome.ts:133`) can throw `RangeError` → 500 on a crafted token; the subscribe decoder is stricter. | Low impact; unify the two decoders. |
| Maybe | `ContactNotes.tsx:152` formats dates in local time without `suppressHydrationWarning` — mismatch near midnight. | Small; worth its own change. |
| Maybe | Suppression lookup on the subscriber page is case-sensitive (`subscribers/queries.ts:213`); every other match lowercases. Latent: writers normalise today. | |
| Maybe | Two concurrent checkouts can create two Stripe customers (`checkout/route.ts:80`). | |
| Nit | `stopImpersonatingAction` can end another operator's session if they edit the cookie (`lib/impersonation.ts` `endImpersonation` matches id only). | Add `adminId` to the predicate. |
| Nit | Provider error text returned to the browser (`test-send:244`, `reply:121`, `welcome/test:95`); billing routes 500 instead of 401 when signed out; ids > 2³¹ give 500. | Authenticated users only. |
| Nit | No CSP beyond `frame-ancestors`. | Clerk and Sentry need nonces. |
| Nit | Duplicated helpers: `escapeHtml` (2 left), five email regexes, `renderTemplate`/`firstNameFrom` (`lib/auto-reply.ts` vs `lib/newsletter.ts`), `readFields`/`wantsHtml` in the two ingest routes, two different `formatDateTime`. | Recorded in the `reuse-first` skill so they aren't copied again. |
| Nit | `components/mail/*` import from `app/(dashboard)/queries.ts`; `settings/access-log` imports from the admin console's `ui.tsx`. | Recorded in `project-structure`. |
| Nit | `tests/contact-rail-escape.test.tsx:47` and `tests/campaign-health.test.ts:108` cast fixtures `as never` (AGENTS.md says `satisfies`). `tests/contrast-tokens.test.ts:313,365,409,720` skip "inherited" palettes with `if (…) return`. | |
| Nit | Lint: `window.location.assign()` for internal navigation in `Composer.tsx:1060,1067`. | |
| Nit | The axe-style probe `__structure()` flags the inbox swipe buttons as "focusable inside aria-hidden"; they have `tabIndex={-1}` while hidden, which axe accepts. Probe false positive. | |
| Nit | `next dev` rewrites the managed block at the top of AGENTS.md on every start. The block itself suggests committing it. | Restored here to keep this branch scoped. |

## Skills run, skipped, and how

| Skill | Result |
| --- | --- |
| `secure-code-review`, `owasp-security` | Applied across all 33 API routes, all six server-action files, rendering, SQL and secrets. No `sql.raw` with user data, no `dangerouslySetInnerHTML`, every webhook and cron check constant-time, every tenant read scoped. |
| `codebase-design` | Applied as the lens for structure and duplication; findings above. |
| `agentic-actions-auditor` | 4 workflows, 0 AI action steps → no findings in its scope. The general permissions gap was fixed. |
| `accessibility`, `accessibility-review` | axe (WCAG 2.2 AA tags) on 6 public pages at 375 and 1280: 0 violations. Project AAA probes on the same pages in real light and dark colour schemes: clean. Probes on 41 harness pages for signed-in screens, both themes, both widths (164 runs, every self-test passed): one real defect (the onboarding overflow, fixed). The rest are exempt disabled controls, the documented brand-colour sample, and missing h1s that come from rendering screens without their page chrome. |
| `agent-browser` | Real browser over the dev server. Public pages loaded with no console errors. |
| `/security-review`, `/code-review`, `/simplify` (diff-based) | **Not run as-is**: they review a branch diff, and the branch had none when the audit started. Their checks were applied to the whole codebase by three parallel read-only reviewers instead, and every finding was verified by hand before going in this report. |
| `github-actions-generator` | **Skipped**: CI already exists and runs typecheck, lint, tests and build. |
| **Signed-in core flow in a browser** | **Not done**: no test login for Clerk. Covered by the harness pages above, which render the signed-in screens without a session. |

## Project-local skills

`.claude/skills/project-structure` and `.claude/skills/reuse-first` exist and
were updated from this audit: `proxy.ts` is the middleware (Next 16), page-level
auth, the `components/` → `app/` breaks, and a table of the helpers that have
one home. **`.claude/skills/` is gitignored** (`.gitignore:39`), so they are not
on this branch and nobody cloning the repo gets them. Un-ignore that path if
they should be shared.

## Decent level?

**Yes.** Typecheck, lint, tests and build pass. The one critical bug (the
sign-off) and every important finding without an open question are fixed and
guarded by tests. No auth bypass, cross-tenant read or injection was found.

What stops it being a clean yes is the "needs your decision" table: the
operator-email-on-Stripe item and the unverified admin chain are the two to
settle first.
