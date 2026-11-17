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

  it("the Add button is the standard button's ink and shape", () => {
    const add = rule(".pbm-label-create");
    expect(add).toContain("color: var(--on-accent)");
    expect(px(add, "border-radius")).toBe(10);
  });
});
