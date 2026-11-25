import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { guide } from "../lib/guides";

/**
 * The words buyers search with, on the pages that should rank for them.
 *
 * ── THE AUDIT, 25 NOV 2026 ──
 * Search engines knew one page of postbox.help, and "Postbox" on its own
 * belongs to a desktop email app. Counting phrases on the live site found the
 * product never said several things a small business types: "team inbox",
 * "email marketing", "info@" and "support@", "UK GDPR", "Outlook" or
 * "Microsoft 365", though most UK small businesses run their email on it. Each
 * is said once or twice where it is true, not stuffed: these pin that it is
 * said at all.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const HOME = read("app/page.tsx");

describe("the site is marked as British English", () => {
  it("sets lang to en-GB", () => {
    expect(read("app/layout.tsx")).toContain('<html lang="en-GB"');
  });
});

describe("the homepage", () => {
  it("names the addresses people forward", () => {
    expect(HOME).toContain("info@");
    expect(HOME).toContain("support@");
  });

  it("names the rules a UK newsletter is sent under", () => {
    expect(HOME).toContain("UK GDPR");
  });

  it("says it works alongside Gmail and Outlook", () => {
    expect(HOME).toMatch(/Gmail/);
    expect(HOME).toMatch(/Outlook/);
  });
});

describe("the guides use the buyer's words", () => {
  it("the shared inbox guide also says team inbox", () => {
    const g = guide("/shared-inbox");
    expect(`${g.title} ${g.answer}`).toMatch(/team inbox/i);
  });

  it("the newsletter guide says email newsletters and email marketing", () => {
    const g = guide("/newsletters-for-small-business");
    expect(g.title).toMatch(/^Email newsletters/);
    expect(g.description).toMatch(/email marketing/i);
  });

  it("there is a comparison for Outlook and Microsoft 365", () => {
    const g = guide("/vs/outlook");
    expect(g.title).toMatch(/Outlook/);
    expect(`${g.description} ${g.answer}`).toMatch(/Microsoft 365/);
  });

  it("the FAQ answers DNS, Outlook and whether it is a help desk", () => {
    const qs = guide("/faq").faq.map((f) => f.q).join(" ");
    expect(qs).toMatch(/DNS/);
    expect(qs).toMatch(/Outlook/);
    expect(qs).toMatch(/help desk/);
  });
});

describe("the setup screen warns Microsoft 365 users before they get stuck", () => {
  it("says external forwarding must be allowed first", () => {
    // Microsoft 365 blocks automatic forwarding to outside addresses by
    // default, so "set up forwarding" silently does nothing for most UK
    // businesses until their administrator allows it.
    expect(read("components/InstallView.tsx")).toMatch(
      /Microsoft 365 blocks automatic forwarding to\s+outside addresses/,
    );
  });
});
