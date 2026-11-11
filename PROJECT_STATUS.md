# Postbox — Project Status

**Date:** 11 November 2026 (updates the 11 October version)
**Repo:** `JordanGrieve/postbox` (public; renamed from `Ticket-System`, which
still redirects) · **Live:** https://postbox.help

The product did not change between 13 October and 11 November; nothing was
committed. This update records one day's work after that pause: the legal
pages brought up to date, a critical Next.js advisory closed, and the three
security gaps that led the known-gaps list closed. `BACKEND-REVIEW.md`
(11 Sep) carries a status note at the top saying which of its findings still
stand; `docs/NEWSLETTER.md` is current as of 11 October and nothing since has
changed it.

## What Postbox is

A multi-tenant SaaS support inbox for small businesses. A client points their
website's contact form and support email at Postbox and everything becomes a
threaded ticket they reply from; replies go out as real branded email and
customer responses thread back into the same ticket. Since September it also
carries the client's newsletter: a signup form, a welcome email, a composer
with an image and products, and a send pipeline.

Built on Next.js 16.4.6, React 19.2, Neon Postgres (Drizzle), Clerk (production
instance, Google OAuth), Resend (all mail, inbound and outbound), Stripe
(billing), Sentry. Deployed on Vercel in London next to the database.

## Current state

**The support inbox is live in production with real clients.** Contact-form
and email ingestion, threading, replies, notifications, auto-replies, labels,
search, snooze, archive, trash, named forms with their own keys, a team of up
to ten per workspace, an access log of operator visits, a data export.

**Newsletters are live.** The first real campaign went out on 14 September
through Resend (6 delivered, 0 failed). Signup is single opt-in by default
with a welcome email the client customises; a workspace can be put back on
double opt-in from the operator console. Campaigns go to every confirmed
subscriber in the workspace; the "lists" concept is no longer on the send
path. Bounces and complaints from Resend suppress the address.

**Billing is wired and partly enforced.** Stripe checkout and portal, a
signature-verified webhook, plans derived from the price id. Prices were
signed off on 11 September at £12 / £29 / £59. The trial is 30 days or 100
tickets, 100 subscribers and 500 emails, whichever runs out first. Per-plan
monthly email allowances (3,000 / 15,000 / 80,000) are enforced at send time;
the ticket and subscriber caps are metered but never block a customer.

**Quality gates.** CI runs typecheck, lint, 1,731 tests across 121 files, and
a production build on every push. Since 11 November `main` is protected: that
check must pass before anything merges, and force-pushes are blocked. Five render harnesses draw every signed-in
screen without a login so the accessibility probes can sweep them. The
product is held to WCAG 2.2 AAA (`STYLE-GUIDE.md`).

**Dependencies.** Next.js 16.4.6 as of 11 November, which closed a critical
advisory against `next` that was published while the project was idle.
`npm audit` shows 18: 16 moderate and two high. The highs are `happy-dom`
(test-only) and `zod` (transitive); `npm audit fix` is offered for both and has
not been run.

## What changed since 11 October

- **Legal pages** (PR 6). The privacy policy was dated 31 August and still said
  campaign sending was not live, named Amazon SES as a sub-processor, described
  double opt-in as the only way onto a list, and never mentioned Stripe. All
  false. Rewritten against the code, with the terms brought into line. Three
  further corrections came from review: a soft bounce is not recorded in the
  campaign report, the trash purge is daily rather than at day 30 exactly, and
  the welcome email can be switched off.
- **Next.js 16.3.8 to 16.4.6** (PR 6), with `eslint-config-next` to match.
- **Three security gaps closed** (PR 7), the first three of the old known-gaps
  list. A workspace invite and the operator lookup now need Clerk's verified
  primary address (`lib/clerk-email.ts`). `/api/inbound` has a workspace bucket
  and a per-sender bucket and answers 429, so Resend redelivers. Test send
  reads the billing entitlement and answers 402. Each new test was run against
  the code with its fix removed and went red.
- **Line endings** (PR 8, open at the time of writing). A `.gitattributes`
  pins every checkout to LF. Without it, a new worktree on Windows checked out
  CRLF and four tests that compare source text failed there and nowhere else.
- **Branch protection on `main`.** The CI check is required before a merge.
- **Housekeeping.** Eight merged local branches and two stale worktrees
  removed.

## What changed between 23 August and 11 October, by theme

**Mail provider.** Amazon denied SES production access on 26 August. On 11
September `CAMPAIGN_DELIVERY_MODE=resend` was added and on 14 September the SES
adapter, its SNS webhook, five env vars and two docs were deleted (about 2,970
lines). Campaigns, ticket replies and welcome emails now share one Resend
account and one monthly allowance. The daily cap on the free plan (100 a day)
is counted and reported to Sentry at 80% and at the cap, never enforced
against a customer's message.

**Newsletter product.** Lists removed from the send path (every list was
empty: nothing had ever created one from a screen). Welcome email, on by
default, with the client's branding, image and products. Single opt-in with a
per-workspace confirmation switch. Hero image and a two-across products grid
in campaigns, from URLs on the client's own shop. "Send now" sends inside the
request rather than waiting for the hourly sweep. Duplicate a sent campaign.
Delete a draft. A campaign that stops because the month's allowance is spent
says so on screen. Test sends render the same email as the real send.

**Billing and limits.** Stripe end to end. `usage_counters` per workspace per
month; the send loop budgets a batch against the remaining allowance before
claiming a row and fails closed if the counter cannot be read.

**Ingestion.** Named forms, each with its own key, workspace key still
accepted. Submissions are read by meaning so Shopify, WordPress and Elementor
field names all work. The pasteable JavaScript snippet was deleted (no selector
is right for every site); the install page offers an AI prompt and a
point-your-form-here mode. Key rotation moved to the operator console with
type-the-name confirmation and an audit row.

**Operator console.** Accounts browser, billing roll-up, per-client health,
feedback drops, quiet-workspace detection, impersonation with a hash-chained
access log and a chained admin action log. The client sees who visited.

**Front end.** Two themes (light and dark, down from six). Every surface
rebuilt for phones: burger drawer, folder strip, swipe rows, bottom sheets.
Every font size in rem; every control 44px; AAA contrast measured on the
rendered page. Tailwind removed. Public pages have a reading width and
structural accessibility guards.

**Project hygiene.** Dev database with a guard that refuses production from a
laptop. Daily health check to Sentry. Every stylesheet parsed in CI. Fixtures
without casts. See `AGENTS.md` for the rules each of these produced.

## Known gaps

Ordered by how much they matter. The three that led this list on 11 October
(email verification, the inbound rate limit, the test-send entitlement) were
closed on 11 November; see above.

1. **Nothing detects a dead sweep.** GitHub disables scheduled workflows in a
   repository with no commits for 60 days, and health can say "not
   configured" but not "no tick for three days". It came close: the project
   went 29 days without a commit before 11 November. Next deadline, if nothing
   is committed: about 10 January 2027.
2. **Stripe webhook has no event dedupe and ignores invoice events.**
   Out-of-order delivery can write stale plan data over newer state.
3. **Consent is enforced in application code only**, at materialisation.
   Suppression has three SQL backstops; consent has none.
4. **Auto-reply delays of 5 minutes and 1 hour are in the type and nothing
   schedules them.** Hidden in the UI; `SUPPORTED_DELAYS` is still immediate
   only.
5. **Invites have no token and no expiry.** No Clerk webhook, so a deleted
   Clerk user leaves a live agent row.
6. **No integration tests run SQL.** Every query is mocked. The next serious
   bug will be in a query and nothing would catch it.
7. **No staging.** Pushes to `main` deploy straight to production with live
   clients aboard. `DEPLOYMENT.md` has the ten-minute setup.
8. **Backups** are Neon's built-ins only.
9. **The welcome-email test send is not gated on billing.** Left on purpose:
   real welcome emails are never blocked for billing, so the test follows them.
   A decision to revisit, not an oversight.

## Things only Jordan can do

`HUMAN_ACTIONS.md` is the list. The two that matter most, both open since
August: rotate the three secrets that passed through chat transcripts (Clerk
live key, Neon password, Resend key), and turn on 2FA for the Google account
and the Clerk dashboard. Nothing in the repo can tell whether either has
happened, which is why every review keeps raising them.

New on 11 November: **sign in once as a brand-new user.** A first-time
sign-in now needs a verified primary address in Clerk. Clerk documents Google
addresses as verified, but this has not been tried with a real sign-in.
Invite a test address and sign in with it. Existing users are matched by
their Clerk id and are not affected.

## Risks

- **Repo is public.** No secrets in code or history (last verified 11 Oct),
  but the documents in it describe the product's own weaknesses. Keep PII in
  the database and keep this file honest rather than flattering.
- **Bus factor 1.** One operator, one admin account.
- **One shared sending reputation.** Every tenant's mail leaves through one
  Resend account and, for campaigns, one marketing address with the client's
  name in front of it. A careless tenant's complaints degrade everyone's
  delivery. The 500-email trial ceiling, the suppression on bounce and
  complaint, and the welcome email's unsubscribe link are the controls.
- **Resend free plan.** 3,000 a month and 100 a day, shared by everything.
  The cap is reported, not enforced; the first active client needs the paid
  tier (`PRICING.md`).
- **Vercel Hobby forbids commercial use.** Upgrade before the first invoice.
- **PECR instigator liability lands on Postbox, not only the client.** The
  consent evidence is captured; the acceptable-use warranty from clients is
  not written.
- **Neon Free compute.** Scheduled jobs wake the database on a fixed cadence
  whatever the client count. A chattier cron suspends the whole product when
  the allowance runs out; that is why "Send now" sends inline instead.

## Lessons kept from the earlier versions

- **A missing secret that disables a check is worse than no check.** The
  inbound webhook once shipped world-writable whenever its secret was absent.
  Every gate since fails closed.
- **Config that throws at import time takes the app down.** Pure modules take
  server values as arguments and never import `lib/config`.
- **Documentation drifts silently and dangerously.** A safety claim that has
  become false is load-bearing for the next person's judgement. This file
  carries a date for that reason; distrust it past a month. The public
  privacy policy proved it: by November it described a mail provider that
  had been removed two months earlier, to anybody who read it.
- **Use the feature once, in a browser, before saying it is done.** The first
  real campaign showed a From line of "newsletter" and a doubled comma in the
  postal address. No test in the repo could have seen either.
- **A grep for one spelling of a write is not proof that no write exists.**
  The repo writes SQL in two styles; search for the table name.
- **SES overwrites custom Message-IDs; Resend's inbound webhook carries
  metadata only; Resend needs the inbound MX at the apex.** All three cost
  days and all three are now built around.
