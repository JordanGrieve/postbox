// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import LabelPicker from "../components/mail/LabelPicker";
import type { LabelChipDTO } from "../components/mail/types";

/*
  Jordan's inbox review, 17 Nov 2026. One guard per item, so none of them
  quietly comes back.
*/

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(cleanup);

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

  it("the label menu hangs from the + Label button, not the row", () => {
    const labels = [
      { id: 1, name: "Wholesale", color: "tag_a", colorHex: null },
    ] satisfies LabelChipDTO[];
    const { container } = render(
      <LabelPicker ticketId={1} labels={[]} allLabels={labels} initiallyOpen />,
    );
    const menu = container.querySelector(".pbm-menu--labels");
    const anchor = menu?.parentElement;
    expect(anchor?.className).toBe("pbm-label-anchor");
    expect(anchor?.querySelector(".pbm-label-add"), "button and menu share the anchor").not.toBeNull();
    expect(rule(MAIL, ".pbm-label-anchor")).toContain("position: relative");
  });

  it("the label menu moves left by its overshoot only, and never off the left edge", () => {
    const labels = [
      { id: 1, name: "Wholesale", color: "tag_a", colorHex: null },
    ] satisfies LabelChipDTO[];
    // happy-dom has no layout: give the menu (272 wide) the left edge it
    // would open at, and the page a 375px width.
    const shiftAt = (menuLeft: number) => {
      const real = Element.prototype.getBoundingClientRect;
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
        if (this.classList.contains("pbm-menu--labels")) {
          return { left: menuLeft, right: menuLeft + 272 } as DOMRect;
        }
        if (this === document.documentElement) return { left: 0, right: 375 } as DOMRect;
        return real.call(this);
      });
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(375);
      const r = render(<LabelPicker ticketId={1} labels={[]} allLabels={labels} initiallyOpen />);
      const left = (r.container.querySelector(".pbm-menu--labels") as HTMLElement).style.left;
      r.unmount();
      vi.restoreAllMocks();
      return left === "" ? 0 : Number(left.replace("px", ""));
    };

    // Fits (desktop, button at 16): stays under the button.
    expect(shiftAt(16)).toBe(0);
    // Button wrapped to the right of a phone (x=257): back inside, 8px clear.
    expect(257 + shiftAt(257) + 272).toBe(375 - 8);
    // Button at 105, the case a plain right-align got wrong (it put the menu
    // at -95). Moves 2px left, not 167.
    expect(105 + shiftAt(105)).toBeGreaterThanOrEqual(8);
    expect(105 + shiftAt(105) + 272).toBeLessThanOrEqual(375 - 8);
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
      ["app/mail.css", ".pbm-label-swatch--pick"],
      ["app/mail.css", ".pbm-label-pick"],
    ];
    for (const [file, sel] of controls) {
      const body = rule(read(file), sel);
      const r = body.match(/border-radius:\s*([^;]+);/)?.[1];
      expect(r, `${sel} declares no radius`).toBeDefined();
      expect(r, `${sel} is round`).not.toMatch(/50%|999px|9999px/);
    }
    // And the picker's small swatch, which overrides the shape.
    expect(rule(MAIL, ".pbm-label-new .pbm-label-swatch--pick")).toMatch(/border-radius:\s*[0-8]px/);
  });

  it("the list of stylesheets checked above is still where the controls live", () => {
    // A guard is only as wide as its input: prove each file still exists.
    const css = readdirSync(join(ROOT, "app")).filter((f) => f.endsWith(".css"));
    for (const f of ["subscribers.css", "settings.css", "newsletter.css", "mail.css"]) {
      expect(css).toContain(f);
    }
  });
});
