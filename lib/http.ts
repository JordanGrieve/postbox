import { looksLikeEmail } from "./email-address";

/** Shared CORS headers for the public ingestion endpoint. */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** JSON response with optional extra headers (e.g. CORS). */
export function json(
  data: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

/** Light email sanity check — good enough to reject obvious junk. */
// The one email shape check lives in lib/email-address.ts (21 Nov 2026);
// this name stays for its existing callers.
export function isValidEmail(email: string): boolean {
  return looksLikeEmail(email);
}

/**
 * The client's IP as the edge reported it, or null when it did not.
 *
 * ── WHICH HEADER, IN WHAT ORDER (21 Nov 2026) ──
 * 1. x-vercel-forwarded-for — set by Vercel's edge to the client's IP. A
 *    client cannot forge it on Vercel; it is the header Vercel documents for
 *    exactly this.
 * 2. x-real-ip — also set by Vercel, and by most reverse proxies.
 * 3. The RIGHTMOST X-Forwarded-For entry. This used to take the leftmost,
 *    which is whatever the client typed: anyone could send
 *    "X-Forwarded-For: 1.2.3.4" and pick their own rate-limit bucket and
 *    their own consent-evidence IP off Vercel. The rightmost entry was added
 *    by the proxy nearest us, so it cannot be chosen by the client.
 *
 * On Vercel the first header is always present, so production behaviour does
 * not change; 2 and 3 only matter if this ever runs somewhere else.
 *
 * Null is a real answer and callers must keep it as one. This is stored as
 * consent evidence, and "we do not know" recorded honestly is worth more than
 * a placeholder that reads like a fact.
 */
export function clientIp(req: Request): string | null {
  return forwardedIp((name) => req.headers.get(name));
}

/**
 * The same rule, over any header source.
 *
 * Exists because not every caller holds a Request. Server components read
 * headers through `next/headers` instead, and a second hand-written copy of
 * "which entry of X-Forwarded-For is the client" is how the two would come to
 * disagree about who is being rate-limited.
 *
 * Takes a getter rather than importing `next/headers` here, so this module
 * stays usable from route handlers, server components and tests alike without
 * dragging a framework dependency into any of them.
 */
export function forwardedIp(get: (name: string) => string | null): string | null {
  // 45 characters is the longest valid IPv6 text form. This is a bound on
  // header content, not a format check — see the note on consentIp in
  // db/schema.ts for why the value is stored verbatim.
  const bounded = (v: string | null | undefined) => {
    const t = v?.trim();
    return t ? t.slice(0, 45) : null;
  };
  const vercel = get("x-vercel-forwarded-for");
  if (vercel) {
    const ip = bounded(vercel.split(",").pop());
    if (ip) return ip;
  }
  const real = bounded(get("x-real-ip"));
  if (real) return real;
  const forwarded = get("x-forwarded-for");
  return forwarded ? bounded(forwarded.split(",").pop()) : null;
}
