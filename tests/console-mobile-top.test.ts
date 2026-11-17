import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
  The console on a phone, Jordan, 17 Nov 2026:
  - "only the overview, accounts, billing, deliverability" stays at the top
    while the page scrolls (pinned tabs);
  - no count on the Accounts tab up there;
  - the details sheet sat beside a white bar: the browser's own scrollbar,
    light because no color-scheme was set, on a page that kept scrolling
    under the sheet.
  The harness measured the tabs at y=0 after scrolling at 375 and 768px.
*/

const ADMIN = readFileSync(join(__dirname, "..", "app", "admin.css"), "utf8");
const GLOBALS = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");

function phoneBlock(): string {
  const start = ADMIN.indexOf("@media (max-width: 980px) {");
  expect(start, "no 980px block in admin.css").toBeGreaterThan(0);
  // To the first closing brace at column 0 after it.
  const end = ADMIN.indexOf("\n}", start);
  return ADMIN.slice(start, end);
}

function ruleIn(css: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`\\n\\s*${esc}\\s*\\{([^}]*)\\}`));
  expect(m, `no rule for ${selector}`).not.toBeNull();
  return m![1]!;
}

describe("console on a phone", () => {
  it("the section tabs stick to the top of the page", () => {
    const phone = phoneBlock();
    const nav = ruleIn(phone, ".pba-nav");
    expect(nav).toContain("position: sticky");
    expect(nav).toContain("top: 0");
    // Sticky sticks only inside its parent: the sidebar must not be a box,
    // and the shell must not clip.
    expect(ruleIn(phone, ".pba-side")).toContain("display: contents");
    const shells = [...phone.matchAll(/\n\s*\.pba-shell\s*\{([^}]*)\}/g)].map((m) => m[1]!);
    expect(shells.length, "no .pba-shell rule in the phone block").toBeGreaterThan(0);
    expect(shells.some((s) => s.includes("overflow: visible")), "the shell still clips").toBe(true);
    // The pinned strip paints its own ground, or content shows through it.
    expect(phone).toMatch(/\.pba-nav,?[\s\S]*?background: var\(--nav\)/);
  });

  it("the Accounts tab shows no count up there", () => {
    expect(ruleIn(phoneBlock(), ".pba-nav .pba-count")).toContain("display: none");
  });

  it("the page behind an open modal does not scroll", () => {
    // The shared modal's rule, in globals.css since 17 Nov 2026.
    expect(ruleIn(GLOBALS, "html:has(.pb-modal[open])")).toContain("overflow: hidden");
  });

  it("every palette tells the browser which scheme to draw its own parts in", () => {
    expect(ruleIn(GLOBALS, ':root,\n[data-theme="light"]')).toContain("color-scheme: light");
    expect(ruleIn(GLOBALS, '[data-theme="dark"]')).toContain("color-scheme: dark");
    const media = GLOBALS.slice(GLOBALS.indexOf("@media (prefers-color-scheme: dark)"));
    expect(ruleIn(media, ":root:not([data-theme])")).toContain("color-scheme: dark");
  });
});
