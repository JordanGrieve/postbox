import { describe, it, expect } from "vitest";
import nextConfig from "../next.config";

/**
 * Every response carries anti-framing and basic hardening headers.
 *
 * There were none at all until the 20 Nov 2026 audit, which left the operator
 * console and the settings screens frameable by any site (clickjacking). Read
 * from the exported config, i.e. after withSentryConfig has wrapped it, so a
 * wrapper that dropped headers() would fail here too.
 */
describe("next.config security headers", () => {
  it("applies the headers to every path", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");
    const rules = await nextConfig.headers!();
    const all = rules.find((r) => r.source === "/:path*");
    expect(all, "a rule covering every path").toBeDefined();

    const byKey = new Map(all!.headers.map((h) => [h.key.toLowerCase(), h.value]));
    expect(byKey.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(byKey.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(byKey.get("x-content-type-options")).toBe("nosniff");
    expect(byKey.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  });

  it("never forbids same-origin framing, which the audit runner needs", async () => {
    const rules = await nextConfig.headers!();
    for (const rule of rules) {
      for (const h of rule.headers) {
        expect(`${h.key}: ${h.value}`).not.toMatch(/DENY|frame-ancestors 'none'/i);
      }
    }
  });
});
