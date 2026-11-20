import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkoutRefusal } from "../lib/stripe";

/**
 * A workspace that already pays must not be able to open a second checkout.
 *
 * Checkout creates a NEW subscription every time. "Change plan" on
 * Settings → Billing used to post to it for paying clients too, so choosing
 * Growth while on Starter left them billed for both — and cancelling either in
 * the portal dropped the workspace to trial while the other was still paid.
 */
describe("checkoutRefusal", () => {
  it("lets a workspace with no subscription check out", () => {
    expect(checkoutRefusal({ stripeSubscriptionId: null })).toBeNull();
  });

  it("refuses a workspace that already has a subscription, and says where to go", () => {
    const reason = checkoutRefusal({ stripeSubscriptionId: "sub_123" });
    expect(reason).toMatch(/already have a subscription/i);
    expect(reason).toMatch(/Manage billing/);
  });
});

describe("app/api/billing/checkout/route.ts", () => {
  const src = readFileSync(
    join(__dirname, "..", "app", "api", "billing", "checkout", "route.ts"),
    "utf8",
  );

  it("asks checkoutRefusal before it creates a Stripe session", () => {
    const refusalAt = src.indexOf("checkoutRefusal(ws)");
    const sessionAt = src.indexOf("checkout.sessions.create");
    expect(refusalAt, "the route consults checkoutRefusal").toBeGreaterThan(-1);
    expect(sessionAt).toBeGreaterThan(-1);
    expect(refusalAt).toBeLessThan(sessionAt);
  });

  it("reads the subscription id it needs for that decision", () => {
    expect(src).toContain("stripeSubscriptionId: workspaces.stripeSubscriptionId");
  });
});
