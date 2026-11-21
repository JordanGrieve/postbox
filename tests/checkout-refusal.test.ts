import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkoutRefusal, operatorBillingRefusal } from "../lib/stripe";

/**
 * Postbox operators never touch a client's billing (21 Nov 2026). A checkout
 * started while impersonating made the client's Stripe customer with the
 * operator's email, so receipts and dunning went to Postbox staff; the portal
 * let them change the card or cancel. Both routes refuse before Stripe.
 */
describe("operatorBillingRefusal", () => {
  it("refuses an operator and lets a client through", () => {
    expect(operatorBillingRefusal({ isAdmin: true })).toMatch(/only be changed by the client/);
    expect(operatorBillingRefusal({ isAdmin: false })).toBeNull();
  });

  for (const route of ["checkout", "portal"]) {
    it(`app/api/billing/${route} refuses operators before it reaches Stripe`, () => {
      const src = readFileSync(
        join(__dirname, "..", "app", "api", "billing", route, "route.ts"),
        "utf8",
      );
      const refusalAt = src.indexOf("operatorBillingRefusal(viewer)");
      const stripeAt = src.indexOf("stripeClient()");
      expect(refusalAt, "the route consults operatorBillingRefusal").toBeGreaterThan(-1);
      expect(stripeAt).toBeGreaterThan(-1);
      expect(refusalAt).toBeLessThan(stripeAt);
    });
  }
});

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
