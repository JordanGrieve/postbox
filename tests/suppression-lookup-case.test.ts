import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The subscriber page finds a suppression whatever its capitalisation.
 *
 * Every other suppression match compares lower(btrim(...)) on both sides
 * (lib/suppressions.ts, lib/campaign-send.ts), because rows written before
 * lib/suppressions.ts existed were not normalised. The subscriber page's
 * lookup compared exactly, so it could say "not suppressed" about an address
 * every send was correctly refusing (AUDIT-REPORT.md, fixed 21 Nov 2026).
 *
 * Source-level, like tests/tenancy-invariants.test.ts: the unit suite has no
 * database. It finds the suppressions select and fails if it cannot.
 */

const src = readFileSync(
  join(__dirname, "..", "app", "(dashboard)", "subscribers", "queries.ts"),
  "utf8",
);

describe("the subscriber page's suppression lookup", () => {
  it("compares the address case- and space-insensitively on both sides", () => {
    const at = src.indexOf(".from(suppressions)");
    expect(at, "found the suppressions lookup").toBeGreaterThan(-1);
    const where = src.slice(at, src.indexOf(".limit(", at));
    expect(where).toMatch(
      /lower\(btrim\(\$\{suppressions\.email\}\)\) = lower\(btrim\(\$\{row\.email\}\)\)/,
    );
    expect(where).not.toMatch(/eq\(suppressions\.email,/);
  });
});
