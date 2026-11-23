/**
 * Other shared-inbox tools' prices, for the pricing page's comparison and the
 * guide pages. One place, because a competitor's price is the one figure on
 * the site that goes stale on its own: when it changes, change it here and
 * the date with it.
 *
 * Checked 23 Nov 2026, from comparison sites quoting each vendor's lowest
 * paid plan, per user, billed yearly, in US dollars before any VAT. Confirm
 * against the vendor's own page (the `source`) when updating.
 *
 * tests/pricing-comparison.test.tsx fails if any rival here becomes cheaper
 * than Postbox for the team it is compared on, so the page can never claim
 * an undercut that is not true.
 */
export const COMPETITORS_CHECKED = "November 2026";

/** The rate PRICING.md uses. An assumption; the dollar figures are the facts. */
export const USD_TO_GBP = 0.79;

export type InboxRival = {
  name: string;
  /** Their cheapest paid plan's name. */
  plan: string;
  /** Per user per month, billed yearly, USD. */
  perUserUsd: number;
  source: string;
};

export const INBOX_RIVALS: InboxRival[] = [
  { name: "Help Scout", plan: "Standard", perUserUsd: 25, source: "https://www.helpscout.com/pricing/" },
  { name: "Front", plan: "Starter", perUserUsd: 25, source: "https://front.com/pricing" },
  { name: "Hiver", plan: "Growth", perUserUsd: 25, source: "https://hiverhq.com/pricing" },
  { name: "Missive", plan: "Starter", perUserUsd: 14, source: "https://missiveapp.com/pricing" },
];

export function rival(name: string): InboxRival {
  const found = INBOX_RIVALS.find((r) => r.name === name);
  if (!found) throw new Error(`No rival ${name}`);
  return found;
}

/** What a team of `seats` pays a month, in dollars. */
export function teamMonthlyUsd(r: InboxRival, seats: number): number {
  return r.perUserUsd * seats;
}

/** Rounded pounds, for "about £59". */
export function aboutGbp(usd: number): number {
  return Math.round(usd * USD_TO_GBP);
}
