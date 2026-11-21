/**
 * The Content-Security-Policy, ENFORCED.
 *
 * ── HOW IT GOT HERE ──
 * Until 21 Nov 2026 the only CSP was `frame-ancestors 'self'` (AUDIT-REPORT.md,
 * "Left for later"). An enforced policy that misses one origin breaks sign-in
 * (Clerk), error reporting or the newsletter previews in production, so this
 * one went out as Content-Security-Policy-Report-Only first. Sentry received
 * no violations, and it was made enforcing the same day (Jordan's call).
 *
 * ── ADDING AN ORIGIN ──
 * A new third-party script, API, frame or font is BLOCKED until it is listed
 * below. The symptom is a feature that silently does nothing in production and
 * a "Refused to load" line in the browser console; the report-uri sends the
 * same to Sentry as a CSP issue.
 *
 * The newsletter and welcome previews are srcdoc iframes, which INHERIT this
 * policy: an email that loaded a web font or a script would be blocked in the
 * preview. Images are allowed from any https origin for that reason.
 *
 * ── WHAT IT ALLOWS, AND WHY ──
 *   script-src   'unsafe-inline': Next's inline bootstrap scripts, with no
 *                nonces (nonces would force every page dynamic; see
 *                node_modules/next/dist/docs/01-app/02-guides/
 *                content-security-policy.md, "Without Nonces"). Plus Clerk's
 *                Frontend API host (clerk-js loads from it), Cloudflare
 *                Turnstile and Clerk's bot protection (Clerk's own defaults in
 *                @clerk/nextjs server/content-security-policy.js), and
 *                vercel.live (the toolbar on preview deployments).
 *   connect-src  Clerk's API and telemetry. Sentry goes through the /monitoring
 *                tunnel (next.config.ts), so it is same-origin.
 *   img-src      https: because newsletter and welcome previews render the
 *                client's own product and hero images from anywhere.
 *   style-src    'unsafe-inline': React style props and the email previews.
 *   frame-src    Turnstile, Clerk protection, vercel.live. The previews are
 *                srcdoc iframes, which frame-src does not govern.
 *
 * ── WHERE REPORTS GO ──
 * Sentry's security endpoint, built from the public DSN at build time, when
 * one is set. No DSN, no report-uri: violations then appear only in the
 * browser console.
 *
 * Pure, so tests/security-headers.test.ts can build it from fixed inputs.
 */

/**
 * The Clerk Frontend API origin, from a publishable key. A key is
 * `pk_live_` or `pk_test_` followed by base64 of the host and a "$".
 * Null if the key is missing or not in that shape.
 */
export function clerkFrontendOrigin(publishableKey: string | undefined): string | null {
  const m = /^pk_(?:live|test)_(.+)$/.exec(publishableKey ?? "");
  if (!m) return null;
  let decoded: string;
  try {
    decoded = atob(m[1]!);
  } catch {
    return null;
  }
  const host = decoded.replace(/\$$/, "");
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? `https://${host}` : null;
}

/**
 * Sentry's CSP report endpoint for a DSN:
 * https://<key>@<host>/<project> → https://<host>/api/<project>/security/?sentry_key=<key>
 */
export function sentryCspReportUri(dsn: string | undefined): string | null {
  if (!dsn) return null;
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    return null;
  }
  const project = url.pathname.replace(/^\/+|\/+$/g, "");
  if (!url.username || !/^\d+$/.test(project)) return null;
  return `${url.protocol}//${url.host}/api/${project}/security/?sentry_key=${url.username}`;
}

export function buildCsp(input: {
  clerkPublishableKey?: string;
  sentryDsn?: string;
  isDev: boolean;
}): string {
  // Without a usable key, Clerk's development hosts, so a local build still
  // reports something sensible.
  const clerk = clerkFrontendOrigin(input.clerkPublishableKey) ?? "https://*.clerk.accounts.dev";
  const clerkProtect = "https://*.protect.clerk.com";
  const turnstile = "https://challenges.cloudflare.com";
  const vercelLive = "https://vercel.live";

  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      [
        "'self'",
        "'unsafe-inline'",
        ...(input.isDev ? ["'unsafe-eval'"] : []),
        clerk,
        turnstile,
        clerkProtect,
        vercelLive,
      ],
    ],
    [
      "connect-src",
      [
        "'self'",
        clerk,
        "https://clerk-telemetry.com",
        "https://*.clerk-telemetry.com",
        "https://img.clerk.com",
        `${clerkProtect}:*`,
        vercelLive,
      ],
    ],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["font-src", ["'self'", "data:"]],
    ["frame-src", ["'self'", turnstile, clerkProtect, vercelLive]],
    ["worker-src", ["'self'", "blob:"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'self'"]],
  ];

  const report = sentryCspReportUri(input.sentryDsn);
  if (report) directives.push(["report-uri", [report]]);

  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}
