import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GUIDES } from "../lib/guides";
import { PLANS } from "../lib/pricing";
import { TITLE_TEMPLATE } from "../lib/page-metadata";
import sitemap from "../app/sitemap";
import { APP_URL } from "../lib/config";

/**
 * The guide pages (lib/guides.ts), added 23 Nov 2026 after an SEO/GEO check
 * found five indexable pages and a brand name owned by an email app.
 *
 * What makes them worth having is checked here: each one is a real route,
 * reachable from the sitemap and the footer, with a search result that fits
 * on the screen, an answer short enough to be quoted, and no price of ours
 * typed by hand.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the guides", () => {
  it("are all there", () => {
    expect(GUIDES.length).toBe(7);
    expect(new Set(GUIDES.map((g) => g.path)).size).toBe(GUIDES.length);
    expect(new Set(GUIDES.map((g) => g.title)).size).toBe(GUIDES.length);
  });

  for (const g of GUIDES) {
    describe(g.path, () => {
      it("is a route that renders this guide", () => {
        const file = join("app", ...g.path.split("/").filter(Boolean), "page.tsx");
        expect(existsSync(join(process.cwd(), file)), `${file} is missing`).toBe(true);
        expect(read(file)).toContain(`guide("${g.path}")`);
      });

      it("fits a search result", () => {
        // Google cuts titles near 60 characters and descriptions near 160.
        expect(TITLE_TEMPLATE.replace("%s", g.title).length).toBeLessThanOrEqual(60);
        expect(g.description.length).toBeLessThanOrEqual(160);
        expect(g.description.length).toBeGreaterThan(70);
      });

      it("answers first, in a quotable length, naming Postbox", () => {
        expect(g.answer).toMatch(/Postbox/);
        expect(g.answer.split(/\s+/).length).toBeLessThanOrEqual(65);
      });

      it("has questions to answer", () => {
        expect(g.faq.length).toBeGreaterThanOrEqual(3);
      });

      it("dates any competitor's figures and links to them", () => {
        if (!g.comparison) return expect(g.path.startsWith("/vs/")).toBe(false);
        expect(g.comparison.checked).toMatch(/^[A-Z][a-z]+ 20\d\d$/);
        expect(g.comparison.source.href).toMatch(/^https:\/\//);
        expect(g.comparison.rows.length).toBeGreaterThanOrEqual(4);
      });
    });
  }

  it("never types one of our prices by hand", () => {
    const source = read("lib/guides.ts");
    for (const plan of PLANS) {
      expect(source).not.toContain(`£${plan.price} `);
      expect(source).not.toContain(`£${plan.price}"`);
    }
  });

  it("are in the sitemap", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    for (const g of GUIDES) expect(urls).toContain(g.path);
  });

  it("are listed in /llms.txt for AI assistants", async () => {
    const { GET } = await import("../app/llms.txt/route");
    const text = await GET().text();
    for (const g of GUIDES) expect(text).toContain(`${APP_URL}${g.path}`);
  });

  it("are linked from the footer on every public page", () => {
    expect(read("components/marketing/MarketingFooter.tsx")).toMatch(/GUIDES\.map/);
  });
});
