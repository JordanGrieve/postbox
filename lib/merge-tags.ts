/**
 * Merge tags: the first-name rule and the `{token}` renderer, shared by the
 * auto-reply (lib/auto-reply.ts) and newsletters (lib/newsletter.ts).
 *
 * Both files had their own copy of firstNameFrom, renderTemplate and tidy,
 * line for line the same, until 21 Nov 2026. Both still export these names
 * (re-exported from here), so callers did not change. The behaviour is
 * pinned by tests/auto-reply.test.ts and tests/newsletter.test.ts.
 *
 * Pure, no imports: safe in client bundles.
 */

/**
 * What `{first_name}` becomes when there is no usable name.
 *
 * Names that are really email addresses count as unknown: inbound mail with no
 * display name is stored as `customerName = sender.email`, and marketing lists
 * routinely put the address in the name column. A customer must never be
 * greeted "Hi bob.smith@acme.co," — on a newsletter that is the tell of a spam
 * blast, and it trains recipients to press the complaint button.
 */
export const UNKNOWN_FIRST_NAME = "there";

/** Extract a usable first name, or the fallback. */
export function firstNameFrom(
  name: string | null | undefined,
  email?: string | null,
): string {
  const raw = (name ?? "").trim();
  if (!raw) return UNKNOWN_FIRST_NAME;
  // A display name that is an address tells us nothing a customer wants read
  // back to them.
  if (raw.includes("@")) return UNKNOWN_FIRST_NAME;
  if (email && raw.toLowerCase() === email.trim().toLowerCase()) {
    return UNKNOWN_FIRST_NAME;
  }

  const first = raw
    .split(/\s+/)[0]
    .replace(/^["'`(<[]+/, "")
    .replace(/["'`)>\].,;:!?]+$/, "")
    .trim();
  if (first.length < 2) return UNKNOWN_FIRST_NAME;
  // Digits or URL punctuation mean this isn't a first name.
  if (/[0-9/\\|]/.test(first)) return UNKNOWN_FIRST_NAME;

  // Normalise shouting and all-lowercase sign-ups; leave mixed case alone so
  // "McDonald" and "O'Neill" survive intact.
  if (first === first.toUpperCase()) {
    return first[0] + first.slice(1).toLowerCase();
  }
  if (first === first.toLowerCase()) {
    return first[0].toUpperCase() + first.slice(1);
  }
  return first;
}

export type MergeValues = Record<string, string>;

/**
 * Substitute merge tokens.
 *
 * Two hard rules:
 *  1. no `{anything}` survives into the output — an unknown or misspelled
 *     token (`{firstname}`, `{order_id}`) is deleted, never passed through. A
 *     customer cannot receive a literal placeholder, and 40,000 people reading
 *     `{first_name}` is an unrecoverable send;
 *  2. the result is tidied, so a deleted token doesn't leave "Hi ," or a
 *     double space behind.
 *
 * Newlines are preserved — only runs of spaces/tabs inside a line collapse.
 * URLs are substituted verbatim and are not touched by the tidy pass.
 */
export function renderTemplate(template: string, values: MergeValues): string {
  const substituted = (template ?? "").replace(
    /\{\s*([a-z0-9_]+)\s*\}/gi,
    (_match, name: string) => {
      const value = values[name.toLowerCase()];
      return typeof value === "string" ? value.trim() : "";
    },
  );
  return tidy(substituted);
}

function tidy(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \t]{2,}/g, " ")
        // " ," / " ." left behind by a removed token.
        .replace(/[ \t]+([,.!?;:])/g, "$1")
        .replace(/[ \t]+$/g, ""),
    )
    .join("\n")
    .trim();
}
