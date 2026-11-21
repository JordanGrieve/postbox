import { describe, it, expect } from "vitest";
import nextConfig from "../next.config";
import { buildReportOnlyCsp, clerkFrontendOrigin, sentryCspReportUri } from "../lib/csp";

describe("lib/csp", () => {
  // pk_test_ + base64("clerk.postbox.help$")
  const KEY = `pk_test_${btoa("clerk.postbox.help$")}`;

  it("finds Clerk's Frontend API host in the publishable key", () => {
    expect(clerkFrontendOrigin(KEY)).toBe("https://clerk.postbox.help");
    expect(clerkFrontendOrigin(undefined)).toBeNull();
    expect(clerkFrontendOrigin("pk_test_!!!")).toBeNull();
  });

  it("builds Sentry's security endpoint from a DSN", () => {
    expect(sentryCspReportUri("https://abc123@o42.ingest.sentry.io/77")).toBe(
      "https://o42.ingest.sentry.io/api/77/security/?sentry_key=abc123",
    );
    expect(sentryCspReportUri(undefined)).toBeNull();
    expect(sentryCspReportUri("not a dsn")).toBeNull();
  });

  it("allows Clerk's host for scripts and connections, and reports to Sentry", () => {
    const csp = buildReportOnlyCsp({
      clerkPublishableKey: KEY,
      sentryDsn: "https://abc123@o42.ingest.sentry.io/77",
      isDev: false,
    });
    const directive = (name: string) =>
      csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";
    expect(directive("script-src")).toContain("https://clerk.postbox.help");
    expect(directive("connect-src")).toContain("https://clerk.postbox.help");
    expect(directive("script-src")).not.toContain("'unsafe-eval'");
    expect(directive("report-uri")).toBe(
      "report-uri https://o42.ingest.sentry.io/api/77/security/?sentry_key=abc123",
    );
  });

  it("has no report-uri without a DSN, and allows eval only in development", () => {
    const csp = buildReportOnlyCsp({ isDev: true });
    expect(csp).not.toContain("report-uri");
    expect(csp).toContain("'unsafe-eval'");
  });
});

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

  it("sends a full CSP as report-only, never enforcing", async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((r) => r.source === "/:path*")!;
    const byKey = new Map(all.headers.map((h) => [h.key.toLowerCase(), h.value]));
    const ro = byKey.get("content-security-policy-report-only");
    expect(ro, "a report-only policy").toBeDefined();
    expect(ro).toMatch(/default-src 'self'/);
    expect(ro).toMatch(/object-src 'none'/);
    // The enforced header stays frame-ancestors only: a missed origin in the
    // full policy must not be able to break production.
    expect(byKey.get("content-security-policy")).toBe("frame-ancestors 'self'");
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
