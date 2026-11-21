import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./lib/sentry-scrub";
import { SENTRY_DATA_COLLECTION } from "./lib/sentry-data-collection";

/**
 * Browser runtime. Runs after document load, before React hydration.
 *
 * Errors + tracing only for now — Session Replay and Logs are deliberately
 * deferred: replay would record agents reading real customer support threads,
 * which needs a privacy-policy decision first (see HUMAN_ACTIONS.md).
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sentry 11 collects everything personal when this is left out; see
  // lib/sentry-data-collection.ts.
  dataCollection: SENTRY_DATA_COLLECTION,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

  // The browser sees the most token URLs (/u/<token>, /s/confirm?t=…) as page
  // loads and navigations. lib/sentry-scrub.ts takes them out.
  // Spans, not transactions: Sentry 11 streams spans and never builds a
  // transaction, so a transaction hook would never run.
  beforeSend: (event) => scrubEvent(event),
  beforeSendSpan: (span) => scrubEvent(span),
  beforeBreadcrumb: (crumb) => scrubEvent(crumb),
});

// Ties client-side App Router navigations into traces.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
