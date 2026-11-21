import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scrubEvent, scrubUrl } from "../lib/sentry-scrub";

/**
 * Secrets in URLs never reach Sentry (AUDIT-REPORT.md, 21 Nov 2026).
 * The unsubscribe token, the opt-in token, a signup's email address, the
 * ingestion key and search text all travel in URLs, and Sentry records URLs
 * on errors, transactions, spans and breadcrumbs.
 */
describe("scrubUrl", () => {
  const cases: [string, string][] = [
    ["https://postbox.help/u/abc123", "https://postbox.help/u/[token]"],
    ["/u/abc123/confirm", "/u/[token]/confirm"],
    ["/s/confirm?t=tok_secret", "/s/confirm?t=[Filtered]"],
    ["/s/check?e=jane%40example.com", "/s/check?e=[Filtered]"],
    ["/s/cli_abc123def456", "/s/[key]"],
    ["POST /api/subscribe/cli_abc123", "POST /api/subscribe/[key]"],
    ["POST https://postbox.help/api/tickets/cli_abc123", "POST https://postbox.help/api/tickets/[key]"],
    ["/search?q=refund%20jane", "/search?q=[Filtered]"],
    ["/sign-in?__clerk_handshake=eyJabc&redirect=/inbox", "/sign-in?__clerk_handshake=[Filtered]&redirect=/inbox"],
  ];
  for (const [raw, want] of cases) {
    it(`scrubs ${raw}`, () => {
      expect(scrubUrl(raw)).toBe(want);
    });
  }

  it("leaves what is not secret alone", () => {
    for (const keep of [
      "/u/[token]",
      "/s/[key]",
      "/s/check",
      "/s/done",
      "/api/tickets/41/reply",
      "/api/tickets/[id]",
      "/inbox?folder=closed&page=2",
      "/settings/website",
    ]) {
      expect(scrubUrl(keep)).toBe(keep);
    }
  });
});

describe("scrubEvent", () => {
  it("scrubs the request, transaction, breadcrumbs, spans and exception text", () => {
    const event = {
      transaction: "GET /u/abc123",
      request: {
        url: "https://postbox.help/s/confirm?t=tok_secret",
        query_string: "t=tok_secret",
        headers: { Referer: "https://postbox.help/u/abc123" },
      },
      breadcrumbs: [{ category: "navigation", data: { from: "/u/abc123", to: "/u/abc123/done" } }],
      spans: [{ description: "GET https://postbox.help/api/subscribe/cli_k1", data: { "url.full": "/u/x9" } }],
      exception: { values: [{ value: "fetch failed for /s/confirm?t=tok_secret" }] },
    };
    const out = JSON.stringify(scrubEvent(event));
    for (const secret of ["abc123", "tok_secret", "cli_k1", "x9"]) {
      expect(out, secret).not.toContain(secret);
    }
    // query_string arrives without its "?"; its first parameter still counts.
    expect(event.request.query_string).toBe("t=[Filtered]");
    expect(event.request.url).toContain("t=[Filtered]");
  });
});

describe("every Sentry config scrubs", () => {
  for (const file of ["instrumentation-client.ts", "sentry.server.config.ts", "sentry.edge.config.ts"]) {
    it(file, () => {
      const src = readFileSync(join(__dirname, "..", file), "utf8");
      expect(src).toMatch(/beforeSend:\s*\(?event\)?\s*=>\s*scrubEvent\(event\)/);
      expect(src).toMatch(/beforeSendTransaction:\s*\(?event\)?\s*=>\s*scrubEvent\(event\)/);
      expect(src).toMatch(/beforeBreadcrumb:\s*\(?crumb\)?\s*=>\s*scrubEvent\(crumb\)/);
    });
  }
});
