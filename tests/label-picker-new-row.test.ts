import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
  The new-label row in the thread's "+ Label" menu. Jordan, 17 Nov 2026:
  "this looks horrible, the buttons are too big, the input field is not like
  the rest of ours". The field was squashed to ~20px by a flex: 1 meant for a
  row, inside a column; the colour dots were drawn at 44px by the touch floor.
  The browser measurement is in the PR; these pin the rules that fixed it.
*/

const CSS = readFileSync(join(__dirname, "..", "app", "mail.css"), "utf8");

function rule(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = CSS.match(new RegExp(`(?:^|\\n)${esc}\\s*\\{([^}]*)\\}`));
  expect(m, `no rule for ${selector} in app/mail.css`).not.toBeNull();
  return m![1]!;
}

const px = (body: string, prop: string) => {
  const v = body.match(new RegExp(`(?:^|[\\s;])${prop}:\\s*(-?\\d+)px`))?.[1];
  expect(v, `${prop} unreadable in:\n${body}`).toBeDefined();
  return Number(v);
};

describe("the label menu's new-label row", () => {
  it("the name field keeps its height in the column", () => {
    expect(rule(".pbm-label-new")).toContain("flex-direction: column");
    expect(rule(".pbm-label-new .pbm-label-input")).toContain("flex: none");
    expect(px(rule(".pbm-label-input"), "height")).toBe(44);
  });

  it("colour dots are drawn small with a 44px square hit area that does not overlap", () => {
    const dot = rule(".pbm-label-new .pbm-label-swatch--pick");
    const drawn = px(dot, "width");
    expect(drawn).toBeLessThanOrEqual(28);
    expect(px(dot, "height")).toBe(drawn);
    expect(dot).toContain("position: relative");

    const hit = rule(".pbm-label-new .pbm-label-swatch--pick::after");
    const grow = -px(hit, "inset");
    expect(drawn + 2 * grow, "hit area is not 44px").toBeGreaterThanOrEqual(44);

    const gap = px(rule(".pbm-label-new .pbm-swatches"), "gap");
    expect(gap, "neighbouring hit squares overlap").toBeGreaterThanOrEqual(2 * grow);
  });

  it("the Add button IS the standard button, and .pbm-label-create only places it", () => {
    // 17 Nov 2026: the look moved to the shared .stg-button. This class must
    // not grow its own look back.
    const add = rule(".pbm-label-create");
    for (const prop of ["background", "color", "border-radius", "height", "font-size"]) {
      expect(add, `.pbm-label-create sets ${prop} again`).not.toMatch(new RegExp(`(?:^|[\\s;])${prop}:`));
    }
    for (const f of ["LabelPicker.tsx", "LabelManager.tsx"]) {
      const src = readFileSync(join(__dirname, "..", "components", "mail", f), "utf8");
      const uses = src.match(/className="[^"]*pbm-label-create[^"]*"/g) ?? [];
      expect(uses.length, `${f} has no Add button`).toBeGreaterThan(0);
      for (const u of uses) expect(u, `${f}: ${u}`).toContain("stg-button");
    }
  });

  it("the custom colour in the menu draws at the presets' size and keeps a 44px box", () => {
    const pick = rule(".pbm-label-new .pbm-label-pick");
    const box = px(pick, "width");
    const pad = px(pick, "padding");
    expect(box).toBeGreaterThanOrEqual(44);
    expect(px(pick, "height")).toBe(box);
    const preset = px(rule(".pbm-label-new .pbm-label-swatch--pick"), "width");
    expect(box - 2 * pad, "drawn custom swatch differs from the presets").toBe(preset);
  });
});
