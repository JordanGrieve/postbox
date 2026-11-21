import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The Stripe webhook only writes a workspace's billing from ITS OWN
 * subscription.
 *
 * Until 21 Nov 2026 any subscription event naming the workspace in its
 * metadata was applied, so a second subscription ending dropped a paying
 * workspace to trial (AUDIT-REPORT.md, "Left for later"). Every write in
 * applySubscription is now conditional, in its WHERE, on the workspace
 * having no subscription or this one.
 *
 * Source-level because the route writes to a database the unit suite does
 * not have; it first proves it found the writes, so it cannot pass on none.
 */

const src = readFileSync(
  join(__dirname, "..", "app", "api", "webhooks", "stripe", "route.ts"),
  "utf8",
);
const apply = src.slice(src.indexOf("async function applySubscription"));

describe("app/api/webhooks/stripe applySubscription", () => {
  it("defines ownership as: no subscription yet, or this one", () => {
    expect(apply).toMatch(
      /or\(\s*isNull\(workspaces\.stripeSubscriptionId\),\s*eq\(workspaces\.stripeSubscriptionId, sub\.id\)\s*\)/,
    );
  });

  it("puts that condition on every write to workspaces", () => {
    const writes = apply.split(".update(workspaces)").slice(1);
    expect(writes.length).toBeGreaterThanOrEqual(2);
    for (const w of writes) {
      const at = w.indexOf(".where(");
      expect(at, "the write has a WHERE").toBeGreaterThan(-1);
      expect(w.slice(at, at + 12)).toBe(".where(owns)");
    }
  });

  it("no longer writes by workspace id alone", () => {
    expect(apply).not.toMatch(/\.where\(eq\(workspaces\.id, workspaceId\)\)/);
  });
});
