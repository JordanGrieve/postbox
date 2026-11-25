import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Spline_Sans_Mono } from "next/font/google";
import { APP_URL } from "@/lib/config";
import { TITLE_TEMPLATE } from "@/lib/page-metadata";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

/*
  Defaults for pages that declare nothing. Every public page declares its own
  through lib/page-metadata.ts; these mostly reach signed-in screens, which
  are not indexed. Written for search, 21 Nov 2026: the old title ("support
  tickets that feel like an inbox") contained nothing anybody searches for.
*/
const TITLE = "Postbox | Shared inbox and newsletters for small businesses";
const DESCRIPTION =
  "Your website's contact form and support email in one shared inbox your team answers from, with newsletters sent from the same place.";

export const metadata: Metadata = {
  /*
    metadataBase is what makes every RELATIVE url in metadata resolve — the
    canonical below, the Open Graph image, the manifest. Without it Next warns
    at build time and emits the paths unresolved, which means a social crawler
    fetching og:image gets "/opengraph-image" and gives up. Link previews then
    fail silently: the page looks fine to a person and blank in Slack, which is
    exactly the kind of thing nobody notices until a customer forwards a link.
  */
  metadataBase: new URL(APP_URL),

  /*
    A template rather than a bare string, so a page setting title: "Pricing"
    gets "Pricing | Postbox" without repeating the suffix at every call site.
    `default` covers pages that set no title at all.
  */
  title: {
    default: TITLE,
    template: TITLE_TEMPLATE,
  },
  description: DESCRIPTION,
  applicationName: "Postbox",

  /*
    No canonical here. It used to be "/", and every page that declared none
    inherited it: /sign-in and /sign-up told crawlers they were the homepage
    while also saying noindex. Each public page sets its own canonical
    (lib/page-metadata.ts); the homepage's is in app/page.tsx.
  */

  openGraph: {
    type: "website",
    siteName: "Postbox",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_GB",
  },
  twitter: {
    // "summary_large_image" and not "summary": the generated card is 1200x630,
    // and declaring the small variant would letterbox it into a thumbnail.
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },

  /*
    The product is sold to British businesses and the copy is British English.
    Saying so stops a crawler guessing from the .help TLD.
  */
  authors: [{ name: "Postbox" }],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google show a full text snippet and a large image preview rather
      // than the conservative defaults it applies when nothing is stated.
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

/**
 * Browser chrome colour, and safe-area handling for installed PWAs.
 *
 * These meta tags take precedence over the manifest's theme_color where both
 * apply, so the manifest value stays as the backstop for the installed app
 * while tabs get a value that at least follows the device's light/dark
 * preference.
 *
 * KNOWN CEILING: media queries can only see the system preference. A
 * workspace theme is set via a data-theme attribute, which
 * CSS media queries cannot observe — a light workspace on a dark device gets the
 * dark chrome colour. Matching it needs a client effect
 * rewriting this tag on theme change, which is not worth a hydration-time
 * flicker for a strip of browser chrome.
 *
 * viewportFit: "cover" is what lets the layout paint into the notch area on
 * an installed iOS PWA instead of letterboxing with white bars.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={`${jakarta.variable} ${splineMono.variable}`}>
      {/*
        No ClerkProvider here — see components/AuthProvider.tsx. It is mounted
        by the five surfaces that actually authenticate, so the marketing,
        legal, signup and unsubscribe pages do not load a third-party auth SDK
        or fire a telemetry beacon at visitors who are not signing in.
      */}
      <body>{children}</body>
    </html>
  );
}
