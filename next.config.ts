import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

/*
  Security headers on every response.

  There were none, so any site could load the operator console or a client's
  settings in an invisible frame and trick a signed-in user into clicking
  through it (clickjacking). Several actions there are one or two clicks: add
  an admin, invite a teammate, set opt-in, trash a ticket.

  SAMEORIGIN, not DENY: the product never frames itself (every preview is an
  srcdoc iframe, which these headers do not affect), but the accessibility
  runner in tests/audit-runner.html loads pages in same-origin iframes, and
  DENY would blank every pane of it.

  Not a full Content-Security-Policy. Clerk and Sentry inject scripts that
  need nonces, which is a project of its own; frame-ancestors is the one
  directive that matters here and needs none.
*/
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    // Contacts and Install moved under /settings when the three configuration
    // surfaces became tabs. These are permanent because the pages genuinely
    // moved — and because the install page's URL is the one a client is most
    // likely to have bookmarked or pasted to whoever builds their website.
    return [
      { source: "/contacts", destination: "/settings/contacts", permanent: true },
      { source: "/install", destination: "/settings/install", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "jordangrievedevelopment",
  project: process.env.SENTRY_PROJECT ?? "postbox",

  // Source-map upload; skipped automatically when the token is absent.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,

  // Routes browser events through our own domain so ad-blockers don't eat them.
  // NOTE: /monitoring must stay a public route in proxy.ts or Clerk will
  // redirect these POSTs to /sign-in.
  tunnelRoute: "/monitoring",

  silent: !process.env.CI,

  // No webpack.treeshake options: Next 16 builds with Turbopack by default and
  // those options are webpack-only.
});
