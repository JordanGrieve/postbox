import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The one way a "<body>.<signature>" link token is signed and checked: the
 * subscribe confirmation (lib/subscribe.ts) and the welcome-email
 * unsubscribe (lib/welcome.ts).
 *
 * ── WHY ONE ──
 * They were two copies, and they had drifted. The welcome decoder compared
 * the signature's STRING length before calling timingSafeEqual, which throws
 * on a BYTE length mismatch, so a signature of the right length in
 * non-ASCII characters threw a RangeError and the unsubscribe page answered
 * 500 instead of "invalid link" (AUDIT-REPORT.md, fixed 21 Nov 2026). The
 * subscribe decoder bounded the input, checked the alphabet and compared
 * buffers; that version is this one.
 *
 * Each use passes its own domain string, mixed into what is signed, so a
 * signature made for one purpose is never valid for the other under a
 * shared key.
 */

export function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signBody(domain: string, body: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(`${domain}.${body}`).digest());
}

const B64URL = /^[A-Za-z0-9_-]+$/;

export type VerifiedBody =
  | { ok: true; body: string }
  | { ok: false; reason: "malformed" | "bad_signature" };

/**
 * Split "<body>.<signature>", check both are base64url, and verify the
 * signature in constant time. Never throws: every bad input is a result.
 *
 * Bounded first, because the token is a URL segment from a stranger and
 * decoding an unbounded string is free CPU for whoever sends it.
 */
export function verifySignedBody(
  token: unknown,
  domain: string,
  secret: string,
): VerifiedBody {
  if (typeof token !== "string" || token.length < 8 || token.length > 4096) {
    return { ok: false, reason: "malformed" };
  }
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return { ok: false, reason: "malformed" };
  const body = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  if (!B64URL.test(body) || !B64URL.test(provided)) {
    return { ok: false, reason: "malformed" };
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(signBody(domain, body, secret));
  // Byte lengths, compared first: timingSafeEqual THROWS on a mismatch, and
  // an uncaught throw here is a 500 (and an oracle).
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true, body };
}
