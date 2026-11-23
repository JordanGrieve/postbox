import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { TITLE_TEMPLATE, inboxTitle, pageMetadata } from "../lib/page-metadata";

/**
 * Every page's title is right once the root template has been applied.
 *
 * app/layout.tsx sets `template: "%s | Postbox"`, so a page names only itself.
 * Eleven signed-in pages also wrote "· Postbox" into their own title and
 * rendered as "Newsletters · Postbox — Postbox". Five more set no title at
 * all and inherited the marketing headline, which says nothing about the
 * screen (2.4.2).
 *
 * Parallel-route slots (a folder starting with "@") are skipped: the title
 * comes from the page they render beside.
 */

const APP = join(process.cwd(), "app");

function pages(dir = APP): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith("@") || entry.name === "api") continue;
      out.push(...pages(full));
    } else if (entry.name === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

const ALL = pages().map((file) => ({
  name: relative(APP, file).split("\\").join("/"),
  source: readFileSync(file, "utf8"),
}));

const SIGNED_IN = ALL.filter(
  (p) => p.name.startsWith("(dashboard)/") || p.name.startsWith("(admin)/"),
);

describe("the title format", () => {
  /*
    Jordan, 23 Nov 2026: "Inbox (3) | Postbox". A bar, not the long dash,
    and the inbox tab carries the count waiting for a reply, like Gmail's.
  */
  it("is the page, a bar, then Postbox", () => {
    expect(TITLE_TEMPLATE).toBe("%s | Postbox");
    expect(readFileSync(join(APP, "layout.tsx"), "utf8")).toMatch(/template:\s*TITLE_TEMPLATE/);
    const og = pageMetadata({ path: "/pricing", title: "Pricing", description: "x" }).openGraph as { title: string };
    expect(og.title).toBe("Pricing | Postbox");
  });

  it("puts the to-reply count in the inbox tab, and nothing when there is none", () => {
    expect(inboxTitle(3)).toBe("Inbox (3)");
    expect(inboxTitle(120)).toBe("Inbox (120)");
    expect(inboxTitle(0)).toBe("Inbox");
  });
});

describe("page titles", () => {
  it("found the pages", () => {
    // 30 since Settings → Labels was deleted with labels (18 Nov 2026).
    expect(ALL.length).toBeGreaterThan(25);
    expect(SIGNED_IN.length).toBeGreaterThan(15);
  });

  it("no page repeats the suffix the root template adds", () => {
    const doubled = ALL.filter((p) =>
      /title:\s*["'`][^"'`]*Postbox["'`]/.test(p.source),
    ).map((p) => p.name);
    expect(doubled).toEqual([]);
  });

  it("every signed-in page names itself", () => {
    const untitled = SIGNED_IN.filter(
      (p) => !/export (const metadata|async function generateMetadata)\b/.test(p.source),
    ).map((p) => p.name);
    expect(untitled).toEqual([]);
  });
});
