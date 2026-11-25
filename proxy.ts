import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Auth boundary (Next.js "proxy" convention — formerly middleware).
 *
 * Dashboard pages require a signed-in user (redirected to /sign-in).
 * API routes are left "public" here and enforce their own auth inside the
 * handler — public ingestion + the inbound webhook must be reachable with no
 * Clerk session, and the authed API routes return 401 JSON (not an HTML
 * redirect) when unauthenticated.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/terms",
  "/privacy",
  // The guide pages (lib/guides.ts). Written out, not a pattern, so a new
  // top-level route is never public by accident.
  "/shared-inbox",
  "/contact-form-to-inbox",
  "/newsletters-for-small-business",
  "/faq",
  "/vs/gmail",
  "/vs/help-scout",
  "/vs/mailchimp",
  "/vs/outlook",
  // The pricing page. Public for the obvious reason — it is a marketing page
  // and the whole point is that people read it before they have an account —
  // but worth a line rather than folding it in silently: it is the first route
  // added here whose omission would not 404 loudly in testing. It would 307 a
  // logged-out visitor to /sign-in, i.e. the pricing link on the homepage
  // would quietly become a sign-in wall for exactly the people it is for.
  "/pricing",
  /*
    The contact page. Public for the same reason as /pricing and with the same
    failure mode if forgotten — it exists precisely for people who have no
    account, so a 307 to /sign-in would make it useless to everybody it is for.
    That is the third time this file has had to say this; tests/public-routes
    now checks it rather than relying on the comment.
  */
  "/contact",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/(.*)",
  // Public unsubscribe. Must work with no session: the RFC 8058 one-click POST
  // arrives unattended from Gmail/Yahoo with no cookies, and the human GET
  // arrives from a mail client. Without this line clerkMiddleware 307s both to
  // /sign-in and the opt-out silently does not happen — which is a legal
  // breach, not a broken page. The token in the path is the whole of the
  // authorisation; see app/u/[token]/route.ts.
  "/u/(.*)",
  // Public newsletter signup: the hosted form, and the pages the double
  // opt-in link lands on. Exactly the same requirement as /u/ above, and it
  // was missed in the same way — the endpoints under /api/ were reachable
  // (they match "/api/(.*)"), so every unit test passed and the feature was
  // still completely unreachable in production. A stranger clicking a
  // confirmation link in their email has no Clerk session and never will;
  // without this line they get a 404 and their consent is never recorded.
  "/s/(.*)",
  /*
    Metadata routes: robots.txt, the sitemap, and the generated Open Graph
    card.

    These are FILES to a crawler and pages to Next, which is what makes them
    easy to lose. The matcher below skips anything ending in a known asset
    extension — that is why /manifest.webmanifest, /icon.svg and
    /apple-icon.png need no line here — but ".txt" and ".xml" are not on that
    list, and /opengraph-image has no extension at all. So all three reached
    clerkMiddleware and 307d to /sign-in.

    The failure is silent in the way this file has now seen three times: the
    build succeeds, the pages exist, and the only symptom is that Google is
    told nothing and every link pasted into Slack previews blank. It was found
    by curling a production build, not by any test — so tests/seo.test.ts now
    covers metadata routes too, and tests/public-routes.test.ts covers pages.
  */
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  // The plain-text summary for AI assistants (app/llms.txt/route.ts).
  "/llms.txt",
    // Sentry's tunnelRoute — browser error/trace events POST here and are
  // forwarded to Sentry. Must not require a session.
  "/monitoring(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    /*
      A signed-in visitor to the homepage goes to their inbox.

      This lived in app/page.tsx as `await auth()`, which made the homepage —
      the busiest page on the site — render on every request with no-store:
      never cached, a slower first byte, no back/forward cache (measured on
      the live site, 21 Nov 2026). Deciding here, before the page, lets the
      page itself be prerendered and served from the CDN.
    */
    if (req.nextUrl.pathname === "/") {
      const { userId } = await auth();
      if (userId) return NextResponse.redirect(new URL("/inbox", req.url));
      return;
    }
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  },
  {
    // Clerk production hardening: only these origins may carry our sessions
    // (protects against subdomain cookie-leak / CSRF-style attacks).
    authorizedParties: [
      "https://postbox.help",
      "http://localhost:3000",
      "http://localhost:8080",
    ],
  },
);

export const config = {
  matcher: [
    /*
      Run on everything except Next internals, static files, and the public
      pages that need no session.

      Every matched request is a function invocation with Clerk's work in it,
      even when the page behind it is a prerendered file on the CDN, and it
      counts against Vercel's CPU allowance. Postbox was paused on 24 Nov 2026
      for using that allowance up, so the marketing pages, the files crawlers
      fetch and Sentry's tunnel skip the proxy. Each name is followed by "$"
      so that only the exact page skips it: /pricingx is still protected.
      They stay in isPublicRoute above as well, which is harmless, and keeps
      tests/public-routes.test.ts reading one list.

      "/" is NOT here: it sends a signed-in visitor to their inbox. Nor is
      /contact, which renders per request. tests/proxy-matcher.test.ts asks
      Next's own matcher which paths run.
    */
    "/((?!_next|monitoring|(?:pricing|terms|privacy|faq|shared-inbox|contact-form-to-inbox|newsletters-for-small-business|vs/gmail|vs/help-scout|vs/mailchimp|vs/outlook|robots\\.txt|sitemap\\.xml|llms\\.txt|opengraph-image)$|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // …and always on API routes.
    "/(api|trpc)(.*)",
    // Clerk's handshake / keyless proxy path.
    "/__clerk/:path*",
  ],
};
