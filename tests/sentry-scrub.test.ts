import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scrubEvent, scrubUrl } from "../lib/sentry-scrub";
import {
  SENTRY_DATA_COLLECTION,
  type SentryDataCollection as DataCollection,
  type SentryStreamedSpan as StreamedSpanJSON,
} from "../lib/sentry-data-collection";

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

  // Sentry 11 streams spans by default and never builds a transaction, so
  // beforeSendTransaction is never called. A streamed span carries its URL
  // in `name` and `attributes`, which the scrubber did not read.
  it("scrubs a streamed span's name and attributes", () => {
    const span = {
      trace_id: "t1",
      span_id: "s1",
      name: "GET /u/abc123",
      start_timestamp: 0,
      status: "ok" as const,
      is_segment: true,
      attributes: {
        "url.full": "https://postbox.help/s/confirm?t=tok_secret",
        "url.path": "/api/subscribe/cli_k1",
        "http.response.status_code": 200,
      },
    } satisfies StreamedSpanJSON;
    const out = JSON.stringify(scrubEvent(span));
    for (const secret of ["abc123", "tok_secret", "cli_k1"]) {
      expect(out, secret).not.toContain(secret);
    }
    expect(span.attributes["http.response.status_code"]).toBe(200);
  });
});

describe("every Sentry config scrubs", () => {
  for (const file of ["instrumentation-client.ts", "sentry.server.config.ts", "sentry.edge.config.ts"]) {
    it(file, () => {
      const src = readFileSync(join(__dirname, "..", file), "utf8");
      expect(src).toMatch(/beforeSend:\s*\(?event\)?\s*=>\s*scrubEvent\(event\)/);
      expect(src).toMatch(/beforeSendSpan:\s*\(?span\)?\s*=>\s*scrubEvent\(span\)/);
      expect(src).toMatch(/beforeBreadcrumb:\s*\(?crumb\)?\s*=>\s*scrubEvent\(crumb\)/);
      // Ignored by Sentry 11's default span streaming; leaving it in reads as
      // if transactions were still scrubbed by it.
      expect(src).not.toMatch(/beforeSendTransaction/);
      expect(src).toMatch(/dataCollection:\s*SENTRY_DATA_COLLECTION/);
    });
  }
});

/*
  Sentry 11 turned an unset `dataCollection` from "collect nothing personal"
  into "collect everything": user info, cookies, headers, request and response
  bodies, query values, database parameters, stack-frame locals. This product's
  bodies are customer mail. Every field is pinned off here, so a field the SDK
  adds a default for later still has to be decided on purpose.
*/
describe("SENTRY_DATA_COLLECTION", () => {
  it("collects nothing personal", () => {
    expect(SENTRY_DATA_COLLECTION).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 5,
    });
  });

  it("names every field the SDK's DataCollection has", () => {
    const fields: Record<keyof Required<DataCollection>, true> = {
      userInfo: true,
      cookies: true,
      httpHeaders: true,
      httpBodies: true,
      urlQueryParams: true,
      graphQL: true,
      genAI: true,
      mcp: true,
      databaseQueryData: true,
      queues: true,
      stackFrameVariables: true,
      frameContextLines: true,
    };
    expect(Object.keys(SENTRY_DATA_COLLECTION).sort()).toEqual(Object.keys(fields).sort());
  });
});
