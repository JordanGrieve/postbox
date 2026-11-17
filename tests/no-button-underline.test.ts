import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/*
  Jordan, 17 Nov 2026: "on all buttons remove the underline on hover and
  active". The one hover underline left is a plain link in running text
  (globals.css, a:not([class]):hover). Every other :hover or :active rule in
  every stylesheet must not add one.

  Discovered, not listed: a guard is only as wide as its input.
*/

const ROOT = join(__dirname, "..");
const sheets = [
  ...readdirSync(join(ROOT, "app"), { recursive: true, encoding: "utf8" }).map((f) => join("app", f)),
  ...readdirSync(join(ROOT, "components"), { recursive: true, encoding: "utf8" }).map((f) =>
    join("components", f),
  ),
].filter((f) => f.endsWith(".css"));

describe("no underline on hover or press, except plain text links", () => {
  it("found the stylesheets", () => {
    expect(sheets.length).toBeGreaterThan(15);
  });

  it("no :hover or :active rule underlines anything but a plain link", () => {
    const offenders: string[] = [];
    for (const f of sheets) {
      const css = readFileSync(join(ROOT, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = m[1]!.trim();
        const body = m[2]!;
        if (!/:(hover|active)\b/.test(selector)) continue;
        if (!/text-decoration(-line)?:\s*[^;]*underline/.test(body)) continue;
        if (selector === "a:not([class]):hover") continue;
        offenders.push(`${f}: ${selector}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the global link rule underlines only a link with no class", () => {
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    expect(css).toMatch(/\na:not\(\[class\]\):hover\s*\{\s*text-decoration: underline;/);
    expect(css, "a bare a:hover is back, and it underlines every button-styled link").not.toMatch(
      /\na:hover\s*\{/,
    );
  });
});
