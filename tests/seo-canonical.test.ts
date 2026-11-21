import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every indexable page says which URL it is.
 *
 * ── THE BUG THIS EXISTS FOR, WHICH I INTRODUCED ──
 * Adding `alternates: { canonical: "/" }` to the root layout looked like an
 * obvious improvement — it collapses ?utm_source, trailing slashes and the
 * www/apex pair onto one address.
 *
 * But metadata INHERITS. A page that sets no canonical of its own gets the
 * parent's, verbatim. So /pricing, /privacy, /terms, /sign-in and /sign-up all
 * emitted `<link rel="canonical" href="https://postbox.help/">` — every one of
 * them telling Google it was a duplicate of the homepage and should be dropped
 * from the index.
 *
 * That is strictly worse than having no canonical at all, and nothing about
 * the page shows it. It was found by curling a production build and reading
 * the head, not by looking at any screen.
 *
 * ── WHAT IS ASSERTED ──
 * A public page must EITHER declare its own canonical OR be explicitly
 * noindex. Both are correct answers; silence is not, because silence means
 * inheriting a claim about a different page.
 */

const ROOT = process.cwd();

/** Page files outside the dashboard and admin, as [route, source]. */
function publicPages(): { route: string; file: string; source: string }[] {
  const found: { route: string; file: string; source: string }[] = [];

  const walk = (dir: string, url: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Route groups contribute nothing to the URL.
        const next = /^\(.*\)$/.test(entry.name) ? url : `${url}/${entry.name}`;
        // The dashboard and admin consoles are behind auth and never indexed.
        if (entry.name === "(dashboard)" || entry.name === "(admin)") continue;
        if (entry.name === "api") continue;
        walk(full, next);
      } else if (entry.name === "page.tsx") {
        found.push({
          route: url === "" ? "/" : url,
          file: full,
          source: readFileSync(full, "utf8"),
        });
      }
    }
  };

  walk(join(ROOT, "app"), "");
  return found;
}

// Either spelled out, or through lib/page-metadata.ts, whose `path` becomes the
// canonical (21 Nov 2026).
const declaresCanonical = (s: string) =>
  /alternates:\s*\{[^}]*canonical/.test(s) || /pageMetadata\(\{\s*path:\s*"\//.test(s);
const declaresNoindex = (s: string) =>
  /robots:\s*\{[^}]*index:\s*false/.test(s);

describe("canonical URLs", () => {
  const pages = publicPages();

  it("finds the public pages at all", () => {
    // Without this, every assertion below could pass on an empty list.
    expect(pages.length).toBeGreaterThan(5);
    expect(pages.map((p) => p.route)).toContain("/pricing");
  });

  /*
    From 21 Nov 2026 the root layout declares NO canonical. Pages that
    declared none still inherited "/" from it — /sign-in and /sign-up told
    crawlers they were the homepage while saying noindex (found on the live
    site). Every page now names its own, the homepage included.
  */
  it("the root layout declares no canonical for pages to inherit", () => {
    const layout = readFileSync(join(ROOT, "app/layout.tsx"), "utf8");
    expect(declaresCanonical(layout)).toBe(false);
    // metadataBase is what lets each page's relative canonical resolve at all.
    expect(layout).toContain("metadataBase");
  });

  for (const page of publicPages()) {
    it(`${page.route} declares its own canonical or is noindex`, () => {
      const ok = declaresCanonical(page.source) || declaresNoindex(page.source);
      expect(
        ok,
        `${page.route} sets neither a canonical nor noindex, so it inherits ` +
          `the root layout's canonical and declares itself a duplicate of the ` +
          `homepage. Add alternates: { canonical: "${page.route}" } or ` +
          `robots: { index: false, follow: false }.`,
      ).toBe(true);
    });
  }
});

describe("the pages that should never be indexed are not", () => {
  /*
   * Each of these carries either a per-recipient secret, a workspace key, or
   * nothing a searcher could want. They were checked individually rather than
   * by rule, because "looks unimportant" is not a property a test can read.
   */
  const MUST_BE_NOINDEX = [
    "app/s/[key]/page.tsx",
    "app/s/check/page.tsx",
    "app/s/confirm/page.tsx",
    "app/s/done/page.tsx",
    "app/u/[token]/confirm/page.tsx",
    "app/u/[token]/done/page.tsx",
    "app/sign-in/[[...sign-in]]/page.tsx",
    "app/sign-up/[[...sign-up]]/page.tsx",
  ];

  for (const file of MUST_BE_NOINDEX) {
    it(file, () => {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(declaresNoindex(source), `${file} is indexable`).toBe(true);
    });
  }
});
