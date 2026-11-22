import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * No block of text wider than 80 characters (WCAG 1.4.8, AAA).
 *
 * The house reading width is 46ch (STYLE-GUIDE.md §3). A `ch` is the width of
 * "0", and in Plus Jakarta Sans real sentences fit far more characters than
 * that suggests: "70ch" ran to about 100 characters, and 54ch — long believed
 * to be "about 80" — was MEASURED at 82–90 on the live Settings pages
 * (desktop journey test, 22 Nov 2026). 46ch puts that worst line at about 77.
 *
 * The same day's gap run first found Settings text at 89–110 characters (62ch,
 * or no limit at all) and six more stylesheets at 60–68ch. Narrower than 46ch
 * is fine: a caption may choose it.
 */
const HOUSE_WIDTH_CH = 46;

function walk(dir: string, found: string[] = []): string[] {
  for (const e of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, found);
    else if (e.name.endsWith(".css")) found.push(rel);
  }
  return found;
}

describe("reading width", () => {
  it(`no stylesheet lets text run wider than ${HOUSE_WIDTH_CH}ch`, () => {
    const files = [...walk("app"), ...walk("components")];
    expect(files.length, "no stylesheets found").toBeGreaterThan(15);

    let widths = 0;
    const offenders: string[] = [];
    for (const file of files) {
      const lines = readFileSync(join(process.cwd(), file), "utf8").split("\n");
      lines.forEach((line, i) => {
        const code = line.replace(/\/\*.*?\*\//g, "");
        const m = /max-width:\s*([\d.]+)ch/.exec(code);
        if (!m) return;
        widths++;
        if (Number(m[1]) > HOUSE_WIDTH_CH) offenders.push(`${file}:${i + 1}  max-width: ${m[1]}ch`);
      });
    }

    // The canary: a scan that matched nothing would pass while checking nothing.
    expect(widths, "no ch reading widths were found").toBeGreaterThan(10);
    expect(offenders, `wider than ${HOUSE_WIDTH_CH}ch can pass 80 characters in this face`).toEqual([]);
  });

  it("the legal column, set inline, is the house width plus its padding", () => {
    // A px width (620) was chosen as "54ch" and is out of reach of the scan
    // above, so it is pinned here.
    const layout = readFileSync(join(process.cwd(), "app/(legal)/layout.tsx"), "utf8");
    expect(layout).toContain(`maxWidth: "calc(${HOUSE_WIDTH_CH}ch + 48px)"`);
  });
});
