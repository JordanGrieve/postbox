import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLANS, TRIAL_DAYS } from "../lib/pricing";
import { organizationJsonLd } from "../lib/structured-data";
import { metadata as homeMetadata } from "../app/page";
import { GET as llmsTxt } from "../app/llms.txt/route";

/**
 * The search and AI-answer basics from the SEO/GEO check of 23 Nov 2026.
 *
 * - /llms.txt was a 404. It is the plain-text summary AI tools read, and it
 *   leads with what Postbox does, because "Postbox" alone is a desktop email
 *   client to every search engine and model.
 * - The Organization logo pointed at an SVG. Google's logo rich result
 *   takes raster images only.
 * - The homepage still used the long dash after the tabs moved to a bar.
 */
describe("/llms.txt", () => {
  it("is served, as plain text, by a public route", async () => {
    const res = llmsTxt();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
    const proxy = readFileSync(join(process.cwd(), "proxy.ts"), "utf8");
    expect(proxy).toContain('"/llms.txt"');
  });

  it("says what Postbox is before anything else, and every plan's real price", async () => {
    const text = await llmsTxt().text();
    expect(text.split("\n")[0]).toBe("# Postbox");
    expect(text).toMatch(/shared inbox/i);
    expect(text).toMatch(/not the Postbox desktop email client/i);
    for (const plan of PLANS) expect(text).toContain(`${plan.name}: £${plan.price} a month`);
    expect(text).toContain(`${TRIAL_DAYS}-day free trial`);
    for (const page of ["/pricing", "/contact", "/privacy", "/terms"]) {
      expect(text).toContain(`https://postbox.help${page}`);
    }
  });
});

describe("structured data", () => {
  it("gives Google a raster logo", () => {
    expect(organizationJsonLd().logo).toMatch(/\.png$/);
  });
});

describe("the homepage title", () => {
  it("uses the bar, like every other tab", () => {
    const title = homeMetadata.title;
    const text = typeof title === "object" && title && "absolute" in title ? title.absolute : title;
    expect(text).toBe("Postbox | Shared inbox and newsletters for small UK businesses");
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).not.toMatch(/const TITLE = "[^"]*—/);
  });
});
