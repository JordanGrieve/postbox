/**
 * The welcome email's merge tokens, as a client reads and writes them.
 *
 * Stored and rendered as `{first_name}` and `{company}`, the tokens every
 * newsletter uses. Shown in the editor as `[First name]` and `[Business
 * name]`, from Jordan's mockup (19 Nov 2026): a person who has never seen a
 * template language reads square brackets as "something goes here", and
 * reads `{company}` as a typo.
 *
 * The translation happens only at the edges of the form — once when it
 * loads, once when it saves, and on the way into the preview — so the
 * renderer, the send and every other screen see the stored form and nothing
 * else changes.
 *
 * Pure, with no imports: the form is a client component.
 */

export const WELCOME_TOKENS = [
  {
    stored: "{first_name}",
    shown: "[First name]",
    insertLabel: "Their first name",
    // Written as literals rather than built from `shown`, so no escaping
    // happens at run time. Case and inner spaces are forgiven: a client who
    // types "[first name]" by hand means the same thing.
    pattern: /\[\s*first\s+name\s*\]/gi,
  },
  {
    stored: "{company}",
    shown: "[Business name]",
    insertLabel: "Your business name",
    pattern: /\[\s*business\s+name\s*\]/gi,
  },
] as const;

/** Stored text → what the editor shows. */
export function toShownTokens(text: string): string {
  let out = text;
  for (const t of WELCOME_TOKENS) out = out.split(t.stored).join(t.shown);
  return out;
}

/** What the editor holds → what is saved and rendered. */
export function toStoredTokens(text: string): string {
  let out = text;
  for (const t of WELCOME_TOKENS) out = out.replace(t.pattern, t.stored);
  return out;
}
