import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./lib/sentry-scrub";
import { SENTRY_DATA_COLLECTION } from "./lib/sentry-data-collection";

/**
 * Node.js server runtime. Loaded from instrumentation.ts's register().
 *
 * With no SENTRY_DSN set the SDK initialises as a no-op and sends nothing —
 * that is the deliberate state until the DSN is added to Vercel + .env.local.
 *
 * PII: this app processes customer support mail (names, addresses, message
 * bodies). `dataCollection` turns every kind of personal data off — request
 * bodies, headers, cookies, user info, stack-frame locals. It has to be
 * passed: from Sentry 11 leaving it out collects all of them
 * (lib/sentry-data-collection.ts). `includeLocalVariables` stays off too —
 * locals in lib/notify.ts and app/api/inbound hold raw customer content.
 */
Sentry.init({
  // Falls back to the public var so there's ONE DSN to configure, not two under
  // different names. A DSN is public by design, so reading the NEXT_PUBLIC_ one
  // server-side costs nothing. (Setting only NEXT_PUBLIC_SENTRY_DSN is exactly
  // how server reporting silently stayed dark after the first deploy.)
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  dataCollection: SENTRY_DATA_COLLECTION,
  includeLocalVariables: false,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Tokens, keys and addresses travel in some URLs here; lib/sentry-scrub.ts
  // takes them out of everything that carries a URL. Spans, not transactions:
  // Sentry 11 streams spans and never builds a transaction to hook.
  beforeSend: (event) => scrubEvent(event),
  beforeSendSpan: (span) => scrubEvent(span),
  beforeBreadcrumb: (crumb) => scrubEvent(crumb),
});
