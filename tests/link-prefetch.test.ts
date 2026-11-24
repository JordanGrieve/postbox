import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Every <Link> says prefetch={false}.
 *
 * ── WHY ──
 * On 24 Nov 2026 Vercel paused postbox.help for 29 days: the Hobby plan's
 * 4 hours of server CPU a month were used up. Next.js prefetches every Link
 * that scrolls into view, and for a dynamic route that is a server render.
 * An inbox of twenty-five rows was twenty-five renders on every load, and
 * again after every automatic refresh, because a refresh empties the cache
 * the prefetches lived in. Nobody had clicked anything.
 *
 * A click now fetches the page it goes to and nothing else. Every dynamic
 * route has a loading.tsx, so the skeleton still appears at once.
 *
 * Discovered, not listed: a new file with a bare <Link> fails here.
 */

const ROOTS = ["app", "components"];

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...tsxFiles(path));
    else if (name.endsWith(".tsx")) out.push(path);
  }
  return out;
}

/** Each `<Link …>` opening tag, up to the first `>` that ends it. */
function linkTags(source: string): string[] {
  const tags: string[] = [];
  let at = source.indexOf("<Link");
  while (at !== -1) {
    const next = source[at + "<Link".length];
    // <LinkSomething> is another component; <Link> or <Link  …> is ours.
    if (next === " " || next === "\n" || next === "\r" || next === ">") {
      const end = source.indexOf(">", at);
      expect(end).toBeGreaterThan(at);
      tags.push(source.slice(at, end + 1));
    }
    at = source.indexOf("<Link", at + 1);
  }
  return tags;
}

describe("Link prefetching", () => {
  const files = ROOTS.flatMap((r) => tsxFiles(join(process.cwd(), r)));

  it("finds the links it is guarding", () => {
    const total = files.reduce(
      (n, f) => n + linkTags(readFileSync(f, "utf8")).length,
      0,
    );
    expect(total).toBeGreaterThan(40);
  });

  it("turns prefetching off on every Link", () => {
    const bare = files.flatMap((f) =>
      linkTags(readFileSync(f, "utf8"))
        .filter((tag) => !tag.includes("prefetch={false}"))
        .map((tag) => `${f}: ${tag.split("\n")[0]}`),
    );
    expect(bare).toEqual([]);
  });
});
