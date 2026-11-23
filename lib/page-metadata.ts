import type { Metadata } from "next";

/**
 * Metadata for one public page: its title, description, canonical address
 * and a COMPLETE share preview.
 *
 * ── WHY A HELPER ──
 * Next merges metadata per key, not per field. A page that set
 * `openGraph: { url, title, type }` replaced the root layout's whole
 * openGraph object, so /pricing, /contact, /privacy and /terms shipped with no
 * og:image, no site name and no locale, and their Twitter card repeated the
 * homepage's text (found on the live site, 21 Nov 2026). Every page now
 * builds the full set here, so a preview cannot be half-inherited again.
 *
 * The image is the generated 1200x630 card (app/opengraph-image.tsx),
 * declared explicitly rather than left to file-based inheritance.
 */
export const SITE_NAME = "Postbox";

/**
 * Every tab's title: "Inbox | Postbox". The root layout's template, and the
 * same shape in the share previews below. A bar since 23 Nov 2026 (Jordan's
 * pick, "Inbox (3) | Postbox"); it was a long dash.
 */
export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

/**
 * The inbox tab's title, with the conversations waiting for a reply, as
 * Gmail shows unread: "Inbox (3)". Just "Inbox" when there are none.
 */
export function inboxTitle(toReply: number): string {
  return toReply > 0 ? `Inbox (${toReply})` : "Inbox";
}

const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Postbox: a shared inbox and newsletters for small businesses",
};

export function pageMetadata(input: {
  /** Path from the site root, e.g. "/pricing". Becomes the canonical. */
  path: string;
  /** The page's own title. Templated to "… | Postbox" unless `absolute`. */
  title: string;
  /** Used as-is, without the " | Postbox" template. For the homepage. */
  absolute?: boolean;
  description: string;
}): Metadata {
  const fullTitle = input.absolute ? input.title : TITLE_TEMPLATE.replace("%s", input.title);
  return {
    title: input.absolute ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_GB",
      url: input.path,
      title: fullTitle,
      description: input.description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
      images: [OG_IMAGE.url],
    },
  };
}
