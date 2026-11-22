import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * No block of text wider than 80 characters (WCAG 1.4.8, AAA).
 *
 * In Plus Jakarta Sans a `ch` is 0.73em, so 54ch is about 80 average
 * characters, and 54ch is the house reading width (STYLE-GUIDE.md §3). The
 * "70ch reads as 70 characters" assumption is the trap: it is about 100.
 *
 * The 22 Nov 2026 gap run measured Settings help text at 89–110 characters a
 * line on desktop. It was set to 62ch, or set to nothing, and the same scan
 * found six more stylesheets at 60–68ch. Every reading width is 54ch or less
 * now, and this keeps it so. Narrower is fine: a 46ch caption is a choice.
 */

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
  it("no stylesheet lets text run wider than 54ch", () => {
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
        if (Number(m[1]) > 54) offenders.push(`${file}:${i + 1}  max-width: ${m[1]}ch`);
      });
    }

    // The canary: a scan that matched nothing would pass while checking nothing.
    expect(widths, "no ch reading widths were found").toBeGreaterThan(10);
    expect(offenders, "wider than 54ch is over 80 characters in this face").toEqual([]);
  });
});
