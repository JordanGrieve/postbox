/**
 * Reading a public form POST: JSON or form-encoded, never a 500.
 *
 * Shared by the two ingest endpoints a client's own website posts to,
 * app/api/tickets/[id] (the contact form) and app/api/subscribe/[key] (the
 * newsletter sign-up). Each had its own identical copy of these until
 * 21 Nov 2026.
 *
 * app/api/subscribe-confirm keeps a form-only reader of its own on purpose:
 * only Postbox's own confirm page posts to it, as a plain HTML form.
 */

export function isJsonRequest(req: Request): boolean {
  return (req.headers.get("content-type") ?? "").includes("application/json");
}

/**
 * A browser's own form submission, which wants a page back rather than JSON:
 * not a JSON body, and an Accept header that asks for HTML.
 */
export function wantsHtml(req: Request): boolean {
  return (
    !isJsonRequest(req) &&
    (req.headers.get("accept") ?? "").includes("text/html")
  );
}

/** JSON or form-encoded fields, as strings. An unparseable body gives {}. */
export async function readFields(req: Request): Promise<Record<string, string>> {
  if (isJsonRequest(req)) {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(body)) {
        if (v != null) out[k] = String(v);
      }
      return out;
    } catch {
      return {};
    }
  }
  // formData() THROWS on a body it cannot parse — text/plain, application/xml,
  // or no content-type at all — and these are public endpoints whose key is
  // embedded in the client's own page source. Unguarded, anyone who views
  // source could turn a malformed POST into a 500. Fall through to the same
  // empty result the JSON branch gives, and let the caller's validation
  // produce the honest 400.
  try {
    const form = await req.formData();
    const out: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}
