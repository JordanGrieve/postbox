import type { MetadataRoute } from "next";

/**
 * Web app manifest. Mobile Postbox is a responsive PWA rather than a native
 * app, so this file is what makes the site installable on Android and what
 * Chrome/Edge use for the desktop "install app" prompt. iOS ignores almost
 * all of it (see app/apple-icon.png).
 *
 * No service worker is registered, deliberately — see the note at the bottom.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // A stable identity for the install, decoupled from start_url. Without an
    // explicit id the browser derives one from start_url, so later moving the
    // launch target would register as a *different* app and users would end up
    // with two icons. Pinning it to "/" means start_url can be changed freely.
    id: "/",

    name: "Postbox",
    // Home-screen labels get truncated around 12 characters, and the product
    // name is already short, so there is nothing to abbreviate.
    short_name: "Postbox",
    description:
      "Turn contact-form submissions and inbound email into a clean, threaded support inbox.",

    // "/" is the marketing landing page. It redirects signed-in users to
    // /inbox, but an installed app should never render the brochure — not even
    // for the frame it takes to bounce. Launching straight at /inbox means a
    // signed-in user lands on their tickets immediately, and a signed-out user
    // is sent to sign-in by Clerk, which is the correct cold-start for an app.
    start_url: "/inbox",

    // Scope stays at the root so sign-in, settings, admin and the legal pages
    // all stay inside the installed window instead of kicking out to a browser
    // tab mid-flow. Clerk's redirect through /sign-in would break otherwise.
    scope: "/",

    display: "standalone",

    // The app is a two-pane inbox that already reflows to a single column; it
    // is usable in either rotation, so there is no reason to lock the user out
    // of landscape on a tablet.
    orientation: "any",

    // A SINGLE static value has to sit under both themes. The media-scoped
    // pair in app/layout.tsx's `viewport` export is what browsers actually
    // use; this only backstops it. Near-black since the palette went
    // monochrome on 11 Nov 2026: a black chrome bar reads as deliberate in
    // either theme, as the purple one did before it.
    theme_color: "#0A0A0A",

    // Paints the Android splash screen behind the icon. Dark, because a dark
    // splash before a light app is far less unpleasant than a full-brightness
    // flash before a dark one, and the black tile with its white mark sits
    // on it as one shape.
    background_color: "#0A0A0A",

    categories: ["business", "productivity"],
    lang: "en",
    dir: "ltr",

    icons: [
      // "any" — rendered as-is (Chrome install prompt, desktop, older Android).
      // Near-black squircle plate so the mark never floats on an unknown wallpaper.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // "maskable" — Android applies its own shape mask (often a circle) and
      // crops. These are full-bleed and opaque with the mark held inside the
      // central safe zone, so nothing gets clipped. Not the same art at a
      // different size; separate files with real padding.
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

// Deliberately no service worker. One would add offline support and a nicer
// cold start, but it is a cache that outlives deploys: without a decided
// versioning and update strategy it serves stale JS to users who then report
// bugs nobody can reproduce. Installability does not require one.
