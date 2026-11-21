import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./lib/sentry-scrub";
import { SENTRY_DATA_COLLECTION } from "./lib/sentry-data-collection";

/**
 * Edge runtime (proxy.ts runs here). Loaded from instrumentation.ts's
 * register(). See sentry.server.config.ts for the PII rationale.
 */
Sentry.init({
  // See sentry.server.config.ts — one DSN, either variable name.
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  dataCollection: SENTRY_DATA_COLLECTION,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // See sentry.server.config.ts and lib/sentry-scrub.ts.
  beforeSend: (event) => scrubEvent(event),
  beforeSendSpan: (span) => scrubEvent(span),
  beforeBreadcrumb: (crumb) => scrubEvent(crumb),
});
