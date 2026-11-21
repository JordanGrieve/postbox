import type * as Sentry from "@sentry/nextjs";

/**
 * What the Sentry SDK may collect: nothing personal. Passed as
 * `dataCollection` by all three configs (browser, Node, edge).
 *
 * ── WHY IT HAS TO BE WRITTEN OUT ──
 * Up to Sentry 10, leaving this out meant `sendDefaultPii: false`: no user
 * info, no cookies, no bodies. Sentry 11 (upgraded 21 Nov 2026) reversed the
 * default — an unset `dataCollection` collects user info, cookies, every
 * header, request and response bodies, query values, database parameters and
 * stack-frame locals. In this product a request body is a customer's email,
 * and locals in lib/notify.ts and app/api/inbound hold the same.
 *
 * Every field is named, including the ones that do not apply here (GraphQL,
 * AI, MCP, queues), so tests/sentry-scrub.test.ts can fail when the SDK adds
 * a field and it has to be decided rather than defaulted to "collect".
 *
 * frameContextLines is source code around a stack frame, not data; 5 is the
 * SDK's own default.
 */
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
  frameContextLines: 5,
} satisfies Required<SentryDataCollection>;

/** The SDK's own type, which @sentry/nextjs does not export by name. */
export type SentryDataCollection = NonNullable<SentryInitOptions["dataCollection"]>;

/** A streamed span as `beforeSendSpan` receives it. */
export type SentryStreamedSpan = Parameters<NonNullable<SentryInitOptions["beforeSendSpan"]>>[0];

type SentryInitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;
