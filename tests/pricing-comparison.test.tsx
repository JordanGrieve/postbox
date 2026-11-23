import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import Pricing from "../app/pricing/page";
import { PLANS, VAT_REGISTERED, formatPrice } from "../lib/pricing";
import {
  COMPETITORS_CHECKED,
  INBOX_RIVALS,
  aboutGbp,
  teamMonthlyUsd,
} from "../lib/competitor-prices";

/**
 * The pricing page's two undercut claims (Jordan, 23 Nov 2026: keep the
 * prices, show the comparison and the final price).
 *
 * Both are promises about money, so both are pinned to the thing that would
 * make them false: a rival's price below ours, or Stripe adding VAT.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const growth = PLANS.find((p) => p.id === "growth");
const html = renderToStaticMarkup(Pricing());

describe("the team-of-three comparison", () => {
  it("prices the plan that has three people", () => {
    expect(growth?.limits.seats).toBe(3);
  });

  it("is cheaper than every rival it names, or it says nothing", () => {
    for (const rival of INBOX_RIVALS) {
      expect(aboutGbp(teamMonthlyUsd(rival, 3)), rival.name).toBeGreaterThan(growth?.price ?? Infinity);
    }
  });

  it("shows each rival's team price, dated, with its source", () => {
    expect(INBOX_RIVALS.length).toBeGreaterThanOrEqual(3);
    for (const rival of INBOX_RIVALS) {
      expect(html).toContain(rival.name);
      expect(html).toContain(`$${teamMonthlyUsd(rival, 3)}`);
      expect(html).toContain(`about £${aboutGbp(teamMonthlyUsd(rival, 3))}`);
      expect(html).toContain(rival.source);
      expect(rival.source).toMatch(/^https:\/\//);
    }
    expect(html).toContain(COMPETITORS_CHECKED);
    expect(html).toContain(formatPrice(growth?.price ?? 0));
  });
});

describe("the final price", () => {
  it("says no VAT is added, while that is true", () => {
    expect(VAT_REGISTERED).toBe(false);
    expect(html).toMatch(/no VAT added/i);
    expect(html).toMatch(/not per person/i);
  });

  it("is true: checkout adds no tax", () => {
    // If this fails, VAT is being charged and the page is lying. Set
    // VAT_REGISTERED and change the copy in the same commit.
    const checkout = read("app/api/billing/checkout/route.ts");
    expect(checkout).not.toMatch(/automatic_tax|tax_rates|default_tax_rates/);
  });
});
