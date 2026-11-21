/**
 * Strip secrets out of URLs before anything reaches Sentry.
 *
 * ── WHY ──
 * Several URLs in this product ARE the credential, or carry personal data:
 *
 *   /u/<token>             a subscriber's unsubscribe token (lib/newsletter.ts
 *                          unsubscribeUrl); anyone holding it can unsubscribe
 *                          them, and /u/<token>/confirm and /done carry it too
 *   /s/confirm?t=<token>   the double opt-in token (lib/subscribe.ts confirmUrl)
 *   /s/check?e=<email>     the address somebody just signed up with
 *   /s/<key>, /api/subscribe/<key>, /api/tickets/<key>
 *                          a workspace's ingestion key, in the path
 *   ?q=                    whatever was typed into search
 *   Clerk's __clerk_* query params, and OAuth code/state
 *
 * Sentry records request URLs on errors, page and request URLs as
 * transaction names and span descriptions, and fetch/navigation URLs as
 * breadcrumbs. Any of those would copy a token into a third-party store that
 * keeps it for months. This was an open item in AUDIT-REPORT.md until
 * 21 Nov 2026.
 *
 * ── HOW ──
 * scrubUrl rewrites the secret parts of any string in place and leaves the
 * rest, so "GET https://postbox.help/u/abc123?x=1" stays readable as
 * "GET https://postbox.help/u/[token]?x=1". The route templates Sentry often
 * uses already ("/u/[token]") are left alone, as are the fixed pages under
 * /s/ (check, confirm, done).
 *
 * scrubEvent applies it to the parts of an event that carry URLs: the
 * request, the transaction name, breadcrumbs, spans, contexts, tags, extra
 * and exception messages. NOT stack frames, whose file paths
 * (app/u/[token]/route.ts) are code, not data.
 *
 * Pure, with no Sentry import, so it runs in the browser, Node and edge
 * configs alike and is unit-tested in tests/sentry-scrub.test.ts.
 */

const FILTERED = "[Filtered]";

/** Query parameters whose value is never sent. */
const SECRET_PARAMS = /([?&](?:t|e|token|key|email|q|code|state|__clerk_[A-Za-z_]*)=)[^&#\s"']*/g;

/** /u/<token>, /u/<token>/confirm, /u/<token>/done. */
const UNSUBSCRIBE = /\/u\/(?!\[)[^/?#\s"']+/g;

/** /s/<key>, but not the fixed /s/check, /s/confirm, /s/done pages. */
const HOSTED_SIGNUP = /\/s\/(?!\[|check\b|confirm\b|done\b)[^/?#\s"']+/g;

/** The public ingestion endpoints, keyed by the workspace's key. */
const SUBSCRIBE_API = /\/api\/subscribe\/(?!\[)[^/?#\s"']+/g;

/**
 * /api/tickets/<key> is contact-form ingestion. /api/tickets/<number>/reply
 * and /status are signed-in routes with a ticket id, which is not secret,
 * so only a non-numeric segment is a key.
 */
const TICKETS_API = /\/api\/tickets\/(?!\[|\d+(?:[/?#\s"']|$))[^/?#\s"']+/g;

export function scrubUrl(value: string): string {
  return value
    .replace(UNSUBSCRIBE, "/u/[token]")
    .replace(HOSTED_SIGNUP, "/s/[key]")
    .replace(SUBSCRIBE_API, "/api/subscribe/[key]")
    .replace(TICKETS_API, "/api/tickets/[key]")
    .replace(SECRET_PARAMS, `$1${FILTERED}`);
}

/** Every string inside a value, scrubbed; objects and arrays walked. */
function scrubDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrubUrl(value);
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = scrubDeep(v, depth + 1);
  return out;
}

/** The shape of the parts of a Sentry event or breadcrumb this touches. */
type Scrubbable = {
  message?: unknown;
  transaction?: unknown;
  request?: unknown;
  breadcrumbs?: unknown;
  spans?: unknown;
  contexts?: unknown;
  tags?: unknown;
  extra?: unknown;
  data?: unknown;
  description?: unknown;
  // A streamed span (Sentry 11's default): its URL is in the name, and the
  // url.* and http.* attributes.
  name?: unknown;
  attributes?: unknown;
  exception?: { values?: { value?: unknown }[] } | undefined;
};

/**
 * Scrub an error event, a breadcrumb or a streamed span, in
 * place, and return it. Typed generically so each Sentry hook keeps its own
 * type: `beforeSend: (e) => scrubEvent(e)`.
 */
export function scrubEvent<T>(event: T): T {
  if (event === null || typeof event !== "object") return event;
  const e = event as Scrubbable;
  // request.query_string arrives without its "?", so the parameter pattern
  // would not see its first name. Scrub it as the query it is.
  const req = e.request as { query_string?: unknown } | undefined;
  if (req && typeof req.query_string === "string") {
    req.query_string = scrubUrl(`?${req.query_string}`).slice(1);
  }
  for (const key of [
    "message",
    "transaction",
    "request",
    "breadcrumbs",
    "spans",
    "contexts",
    "tags",
    "extra",
    "data",
    "description",
    "name",
    "attributes",
  ] as const) {
    if (e[key] !== undefined) e[key] = scrubDeep(e[key]);
  }
  for (const v of e.exception?.values ?? []) {
    if (typeof v.value === "string") v.value = scrubUrl(v.value);
  }
  return event;
}
