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

  it("text capped in px is no wider than the house width at its own size", () => {
    /*
      22 Nov 2026: the homepage's .home-sub was capped at 620px, out of reach
      of the ch scan, and measured 82 characters a line. A rule that sets a
      rem font-size and a px max-width is a text block sized in px; its cap
      in em must not exceed 46ch, which in this face is 46 x 0.73 = 33.6em.
    */
    const MAX_EM = HOUSE_WIDTH_CH * 0.73;
    // Not prose: a layout box whose text sets its own (ch) reading width.
    const LAYOUT_BOXES = new Set([".mkt-footer"]);
    const files = [...walk("app"), ...walk("components")];
    let capped = 0;
    const offenders: string[] = [];
    for (const file of files) {
      const css = readFileSync(join(process.cwd(), file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = m[1].trim();
        const mw = /max-width:\s*([\d.]+)px/.exec(m[2]);
        const fs = /font-size:\s*([\d.]+)rem/.exec(m[2]);
        if (!mw || !fs || LAYOUT_BOXES.has(selector)) continue;
        capped++;
        const em = Number(mw[1]) / (Number(fs[1]) * 16);
        if (em > MAX_EM) offenders.push(`${file}  ${selector}  ${mw[1]}px = ${em.toFixed(1)}em`);
      }
    }
    expect(capped, "no px-capped text rules were found").toBeGreaterThan(3);
    expect(offenders, `wider than ${MAX_EM.toFixed(1)}em can pass 80 characters`).toEqual([]);
  });

  it("the legal column, set inline, is the house width plus its padding", () => {
    // A px width (620) was chosen as "54ch" and is out of reach of the scan
    // above, so it is pinned here.
    const layout = readFileSync(join(process.cwd(), "app/(legal)/layout.tsx"), "utf8");
    expect(layout).toContain(`const COLUMN_WIDTH = "calc(${HOUSE_WIDTH_CH}ch + 48px)"`);
  });

  it("the legal header is the same column as the prose, so the logo lines up", () => {
    // 22 Nov 2026: the prose went to 46ch and the header stayed at 620px, so
    // their left edges sat 42px apart. A ch is relative to font size, so both
    // need the same width AND the same font size to be the same box.
    const layout = readFileSync(join(process.cwd(), "app/(legal)/layout.tsx"), "utf8");
    const styleOf = (tag: string) => {
      const m = new RegExp(`<${tag}[\\s\\S]*?style=\\{\\{([\\s\\S]*?)\\}\\}`).exec(layout);
      expect(m, `no inline style on <${tag}>`).not.toBeNull();
      return m?.[1] ?? "";
    };
    for (const tag of ["header", "main"]) {
      expect(styleOf(tag)).toContain("maxWidth: COLUMN_WIDTH");
      expect(styleOf(tag)).toContain("fontSize: COLUMN_FONT_SIZE");
    }
  });
});
