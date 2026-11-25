import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The back links' glyphs (Jordan, 25 Nov 2026).
 *
 * "‹ Website & email" used the text character, which in Plus Jakarta Sans is a
 * speck well below the cap height of the label beside it. It is the icon set's
 * `back` chevron now, sized in rem so it follows text zoom and sits level with
 * the label. "← All clients" in the sidebar loses its arrow altogether.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const BACK = read("app/(dashboard)/settings/SettingsBackLink.tsx");
const CSS = read("app/settings.css");
const SHELL = read("components/mail/MailNavShell.tsx");

function rule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

describe("the settings back link", () => {
  it("draws the chevron from the icon set, not a text character", () => {
    expect(BACK).toContain('<Icon name="back" className="stg-back-icon" />');
    expect(BACK).not.toContain("‹");
  });

  it("sizes it in rem, at least as tall as the label's text", () => {
    const r = rule(CSS, ".stg-back-icon");
    const width = r.match(/width:\s*([\d.]+)rem/);
    const height = r.match(/height:\s*([\d.]+)rem/);
    expect(width?.[1]).toBeDefined();
    expect(height?.[1]).toBeDefined();
    // The label is 0.84375rem; the chevron's box must be bigger than that,
    // since the drawn stroke only fills the middle 14 of its 24 units.
    expect(Number(height?.[1])).toBeGreaterThan(0.84375);
    expect(r).toContain("flex: none");
  });
});

describe("the sidebar's All clients link", () => {
  it("has no arrow", () => {
    const at = SHELL.indexOf('className="pbm-admin-link"');
    expect(at).toBeGreaterThan(-1);
    const link = SHELL.slice(at, SHELL.indexOf("</Link>", at));
    expect(link).not.toContain("←");
    expect(link).toContain("All clients");
  });
});
