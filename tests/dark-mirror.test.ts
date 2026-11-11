import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The dark palette is written twice in app/globals.css: once for a workspace
 * that picked dark ([data-theme="dark"]) and once for a page with no theme on
 * a device that prefers dark (the prefers-color-scheme block). Public pages,
 * marketing, subscribe and unsubscribe use the second. Nothing kept the two
 * in step, so a palette change made to one would ship half-done to the
 * other. This compares every custom property, name and value.
 */

const CSS = readFileSync(join(process.cwd(), "app/globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

function declarations(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out.set(m[1]!, m[2]!.trim().replace(/\s+/g, " "));
  }
  return out;
}

function blockAfter(marker: string): string {
  const at = CSS.indexOf(marker);
  expect(at, `globals.css has no ${marker}`).toBeGreaterThan(-1);
  const open = CSS.indexOf("{", at + marker.length - 1);
  const close = CSS.indexOf("}", open);
  return CSS.slice(open + 1, close);
}

describe("the dark palette and its prefers-color-scheme mirror", () => {
  const explicit = declarations(blockAfter('[data-theme="dark"] {'));
  const mirror = declarations(blockAfter(":root:not([data-theme]) {"));

  it("both parse to a real palette", () => {
    expect(explicit.size).toBeGreaterThan(40);
    expect(mirror.size).toBeGreaterThan(40);
  });

  it("declare the same properties with the same values", () => {
    expect(Object.fromEntries(mirror)).toEqual(Object.fromEntries(explicit));
  });
});
