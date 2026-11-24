import { describe, it, expect, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

/**
 * Which requests run proxy.ts at all.
 *
 * Every request the proxy matches is a function invocation with Clerk's work
 * in it, which counts against Vercel's CPU allowance even when the page behind
 * it is a prerendered file on the CDN. Postbox was paused for using up that
 * allowance on 24 Nov 2026. So the public pages that need no session skip the
 * proxy: the marketing pages, the files crawlers fetch, and Sentry's tunnel.
 *
 * Asked through Next's own matcher (unstable_doesMiddlewareMatch) rather than
 * a copy of its rules, so the test means what the build means.
 */

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: () => () => undefined,
  createRouteMatcher: () => () => false,
}));

const { config } = await import("@/proxy");

function runsProxy(path: string): boolean {
  return unstable_doesMiddlewareMatch({ config, url: path });
}

describe("proxy matcher", () => {
  it.each([
    "/pricing",
    "/terms",
    "/privacy",
    "/faq",
    "/shared-inbox",
    "/contact-form-to-inbox",
    "/newsletters-for-small-business",
    "/vs/gmail",
    "/vs/help-scout",
    "/vs/mailchimp",
    "/robots.txt",
    "/sitemap.xml",
    "/llms.txt",
    "/opengraph-image",
    "/monitoring",
  ])("skips %s, which needs no session", (path) => {
    expect(runsProxy(path)).toBe(false);
  });

  it.each([
    // The homepage sends a signed-in visitor to their inbox from the proxy.
    "/",
    "/inbox",
    "/tickets/12",
    "/settings",
    "/newsletters",
    "/admin",
    "/sign-in",
    "/sign-up",
    "/contact",
    "/api/inbox/live",
    "/api/cron/auto-replies",
    // A path that only STARTS with a skipped name is still protected.
    "/pricingx",
    "/termsheet",
    "/vs/gmailx",
  ])("still runs on %s", (path) => {
    expect(runsProxy(path)).toBe(true);
  });
});
