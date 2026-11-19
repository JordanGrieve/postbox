// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/*
  Jordan's inbox review, 17 Nov 2026. One guard per item, so none of them
  quietly comes back. (The three about the "+ Label" menu went with labels,
  18 Nov 2026.)
*/

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const MAIL = read("app/mail.css");

function rule(css: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`));
  expect(m, `no rule for ${selector}`).not.toBeNull();
  return m![1]!;
}

describe("inbox review, 17 Nov 2026", () => {
  it("the list has no All / Unread / Starred quick filter", () => {
    // "remove this quick filter, it's redundant" - Unread and Starred are
    // folders in the nav beside it.
    for (const f of [
      "components/mail/MessageList.tsx",
      "app/(dashboard)/loading.tsx",
      "app/(dashboard)/inbox/loading.tsx",
    ]) {
      const src = read(f);
      expect(src, `${f} still renders the refine chips`).not.toContain('className="pbm-chips"');
      expect(src, `${f} still renders the refine chips`).not.toContain("Refine this page");
    }
  });

  it("the modal scrim is a neutral ink wash, not the old indigo", () => {
    const m = MAIL.match(/--pbm-scrim:\s*rgba\(\s*(\d+),\s*(\d+),\s*(\d+)/);
    expect(m, "--pbm-scrim unreadable").not.toBeNull();
    const [r, g, b] = m!.slice(1).map(Number);
    expect(r, "scrim is tinted").toBe(g);
    expect(g, "scrim is tinted").toBe(b);
  });

  it("the contact panel slides out slowly enough to see, on a wide screen too", () => {
    const rail = rule(MAIL, ".pbm-rail");
    const ms = [...rail.matchAll(/(opacity|transform|margin-right|display) (\d+)ms/g)];
    expect(ms.map((m) => m[1]).sort()).toEqual(["display", "margin-right", "opacity", "transform"]);
    for (const m of ms) expect(Number(m[2]), `${m[1]} is too quick to see`).toBeGreaterThanOrEqual(300);
    // Wide screens: the column slides off by its own width rather than
    // vanishing, both closing and (via @starting-style) opening.
    const wide = MAIL.match(/@media \(min-width: 1181px\) \{([\s\S]*?)\n\}/);
    expect(wide, "no wide-screen rail block").not.toBeNull();
    expect(wide![1]).toContain('.pbm-rail[data-rail="closed"]');
    expect(wide![1]).toContain("@starting-style");
    expect(wide![1].match(/margin-right: -290px/g)?.length).toBe(2);
    expect(rule(MAIL, ".pbm-rail")).toContain("width: 290px");
  });

  it("the tooltip is a rectangle with even corners", () => {
    const rules = [...MAIL.matchAll(/\.pbm-icon-btn\[data-tip\]::after\s*\{([^}]*)\}/g)];
    const bubble = rules.find((r) => r[1]!.includes("attr(data-tip)"));
    expect(bubble).toBeDefined();
    const band = Number(bubble![1].match(/border-top:\s*(\d+)px solid transparent/)?.[1]);
    const radius = bubble![1].match(
      /border-radius:\s*(\d+)px (\d+)px (\d+)px (\d+)px \/ (\d+)px (\d+)px (\d+)px (\d+)px/,
    );
    expect(radius, "corners must be given per side, or the band squashes the top two").not.toBeNull();
    const [h1, h2, h3, h4, v1, v2, v3, v4] = radius!.slice(1).map(Number);
    // What the eye sees: top corners lose the band from their vertical radius.
    const seen = [
      [h1, v1 - band],
      [h2, v2 - band],
      [h3, v3],
      [h4, v4],
    ];
    for (const [h, v] of seen) {
      expect(h, "corner is not round").toBe(v);
      expect(h, "too round to read as a rectangle").toBeLessThanOrEqual(8);
    }
  });

  it("no button anywhere is a pill or a circle", () => {
    // Dots, avatars, status badges and the switch knob may be round; they are
    // not buttons. Every class listed here is a control.
    const controls: [file: string, selector: string][] = [
      ["app/subscribers.css", ".psb-filter"],
      ["app/settings.css", ".st-chip"],
      ["app/newsletter.css", ".nl-token"],
      // The label picker's swatches were here until labels left the inbox on
      // 19 Nov 2026; the inbox's own controls now are its tabs and icon buttons.
      ["app/mail.css", ".pbm-tab"],
      ["app/mail.css", ".pbm-icon-btn"],
    ];
    for (const [file, sel] of controls) {
      const body = rule(read(file), sel);
      const r = body.match(/border-radius:\s*([^;]+);/)?.[1];
      expect(r, `${sel} declares no radius`).toBeDefined();
      expect(r, `${sel} is round`).not.toMatch(/50%|999px|9999px/);
    }
  });

  it("the list of stylesheets checked above is still where the controls live", () => {
    // A guard is only as wide as its input: prove each file still exists.
    const css = readdirSync(join(ROOT, "app")).filter((f) => f.endsWith(".css"));
    for (const f of ["subscribers.css", "settings.css", "newsletter.css", "mail.css"]) {
      expect(css).toContain(f);
    }
  });
});
