# Human actions — Postbox

**Date:** 11 November 2026 (updates the 11 October version). Things only
Jordan can do; everything code-side is handled.
Ordered by leverage within each group. Tick as you go, and when something is
done, say so here, because nothing in the repo can tell.

Items about Amazon SES are gone: SES was removed from the product on
14 September 2026 after AWS denied production access. There is nothing to set
up, confirm or reply to on the AWS side any more.

## 1 · Do now

- [ ] **Sign in once as a brand-new user** — new on 11 Nov. Since the
  security fixes that day, a first-time sign-in needs a *verified* primary
  email address in Clerk; an unverified one is sent to /no-access. Clerk
  documents Google addresses as verified, but nobody has tried it with a
  real sign-in. Invite a test address from the operator console and sign in
  with it once. Existing users are matched by their Clerk id and are not
  affected. **5 min.**
- [ ] **Rotate the three exposed secrets** — Clerk `sk_live`, the Neon
  database password and the Resend API key all passed through AI chat
  transcripts during setup in August. Open since 3 August and the oldest
  unresolved security item. **How:** regenerate each in its dashboard (Clerk →
  API keys; Neon → Roles → reset password; Resend → API keys), then update the
  value in Vercel (then Redeploy) and in `.env.local`. **15 min.**
- [ ] **Turn on 2FA for your Google account** — you sign into Postbox only
  through Google OAuth, so Google's second factor gates the sign-in before
  Clerk is reached. myaccount.google.com → Security → 2-Step Verification.
  **2 min.**
- [ ] **Turn on 2FA for the Clerk dashboard account** — a different account
  and the bigger blast radius: it administers the whole instance.
  dashboard.clerk.com → avatar → Account → Security. **2 min.**
- [ ] **Tidy the Resend inbound webhook URL** — the `?secret=` query form was
  removed from the code on 13 Oct 2026; deliveries are authorised by their
  Svix signature (`RESEND_WEBHOOK_SIGNING_SECRET` is set in Vercel). If the
  endpoint URL in Resend → Webhooks still ends in `?secret=...`, edit it off
  so the old value stops being written to logs. Harmless either way.
  **2 min.**
- [ ] **Upgrade Vercel to Pro (~$20/mo)** — Hobby's terms prohibit commercial
  use, and Postbox has real business clients and a pricing page. This has
  nothing to do with cron any more (scheduling runs on GitHub Actions); it is
  a licensing matter. Vercel → Settings → Billing → Pro.
- [ ] **Resend paid tier before the first active client** — the free plan is
  3,000 emails a month capped at **100 a day**, and every tenant's
  acknowledgements, replies, welcome emails and campaigns leave through the
  one account. The daily health check warns at 80% and errors at the cap, but
  nothing can unblock it except the plan. Watch resend.com/metrics.

## 2 · Do soon

- [ ] **Set up staging** — ten minutes of dashboard clicks, documented in
  `DEPLOYMENT.md`: a Neon branch, a Preview-scoped `DATABASE_URL`, dev-instance
  Clerk keys for previews. Until then every merge to `main` deploys straight
  to the live clients. Branch protection (11 Nov) now makes that merge wait
  for CI, which catches a broken build but not a change that works and is
  wrong.
- [ ] **Read your Neon CU-hours for last month** — the one number
  `PRICING.md` could not compute. Three scheduled jobs wake the compute on a
  fixed cadence (auto-reply sweep every 15 minutes, campaign sweep hourly,
  health check daily). If usage is near the 100-hour free allowance, the
  sweep cadence is the cheapest saving available. Neon → Billing.
- [ ] **Decide on backups** — Neon Free has limited point-in-time recovery.
  Options: Neon paid; a nightly `pg_dump` from GitHub Actions to private
  storage (needs a bucket and keys from you, in secrets, not chat); accept
  the risk. Recommendation: the dump.
- [ ] **Have the Terms and Privacy pages reviewed by a human** — honest and
  tailored, written by an AI, and rewritten again on 11 Nov 2026 because the
  live privacy policy still said campaign sending was off and named Amazon
  SES as a sub-processor. It now lists Neon, Clerk, Resend, Vercel,
  Cloudflare, Sentry and Stripe, describes single opt-in as the default, and
  describes operator access and the access log; check it matches what you
  run. The terms lost a sentence saying nothing in them was "an offer of a
  working send today", which was a contractual statement, not only a fact.
- [ ] **Write the acceptable-use warranty** — the clause where each client
  warrants that their subscriber list was consented. Under PECR, Postbox is
  liable as the party that transmits or instigates a marketing email; the
  consent evidence the product captures is the technical half and this is
  the contractual half.
- [ ] **Decide the Sentry plan** — the free Developer tier (5,000 errors a
  month) is enough. Let the trial lapse rather than upgrading; nothing in the
  code depends on paid features.
- [ ] **Keep the repository active** — GitHub switches off scheduled
  workflows in a repository with no commits for 60 days, and the auto-reply
  sweep, the campaign sweep and the daily health check are all scheduled
  workflows. Nothing in the product notices when they stop. The project went
  29 days without a commit before 11 Nov 2026. Next deadline, if nothing is
  committed: about 10 January 2027. Any commit resets it.
- [ ] **Check the `.help` renewal** — year one was £1.99; renewal is roughly
  £20–30. Confirm auto-renew and a valid card at the registrar. Everything
  dies with the domain.

## 3 · Verify, because the repo cannot

These may already be done. Each is a Vercel or dashboard setting the code
reads but cannot report on.

- [ ] `CRON_SECRET` set in Vercel **and** as a GitHub Actions repository
  secret, with `APP_URL` as a repository variable. Marked done on 23 August.
  A 503 in a sweep run means it is unset on Vercel; a 401 means the two copies
  differ.
- [ ] `CAMPAIGN_DELIVERY_MODE=resend` and `CAMPAIGN_FROM_ADDRESS` set in
  Vercel. The 14 September campaign proves they were then.
- [ ] `POSTBOX_CONTACT_KEY` set, so `/contact` posts into Postbox's own
  workspace. Until it is, the page says it is not connected rather than
  dropping messages.
- [ ] `SUBSCRIBE_TOKEN_SECRET` set as its own value rather than falling back
  to the inbound secret.
- [ ] `IMPERSONATION_CHAIN_SECRET` and `ADMIN_ACTION_CHAIN_SECRET` chosen once
  and stored somewhere the holder of `DATABASE_URL` is not. They cannot be
  rotated later.
- [ ] `RESEND_DELIVERY_WEBHOOK_SIGNING_SECRET` set for the second Resend
  endpoint (`/api/webhooks/resend`), which is what writes "Delivered" under a
  reply and suppresses an address on a campaign bounce.

## 4 · Decisions

- [ ] **Product name** — "Postbox" is an existing email client. No issue at
  this scale; decide before spending on marketing or SEO.
- [ ] **Per-tenant sending domains, or one shared marketing address** — today
  every client's campaign leaves from one verified address with their name in
  front of it. Per-tenant domains isolate reputation and solve PECR's sender
  identification, and get harder to retrofit every week.
- [ ] **Ask the pilot clients for structured feedback** — what is confusing,
  what is missing, would they pay. Only you can have that conversation.

## 5 · Done, kept for the record

- Sentry error monitoring, browser and server, verified in production (3 Aug).
- DMARC report address fixed (3 Aug). Orphan Clerk user deleted (3 Aug).
- Privacy policy lists Sentry and (later) Stripe as sub-processors.
- `CRON_SECRET` and `APP_URL` set (23 Aug).
- Prices signed off at £12 / £29 / £59 (11 Sep).
- Amazon SES removed, campaigns sending through Resend (14 Sep).
- Contact page and the Postbox workspace it posts into (30 Aug; key status
  unverified, see §3).
- Branch protection on `main` (11 Nov): the CI check must pass before a
  merge; force-pushes and deleting `main` are blocked. No approval is
  required, since GitHub will not let you approve your own PR, and as admin
  you can still override with `gh pr merge --admin` in an emergency.
- Next.js 16.4.6 (11 Nov), which closed a critical advisory published while
  the project was idle.
