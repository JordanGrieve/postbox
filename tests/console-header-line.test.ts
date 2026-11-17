import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
  The console's two top rules, the header's border and the sidebar's divider
  under the brand, are one line. Jordan, 17 Nov 2026: "make these line up so
  the lines are together". Measured in the harness at 981 to 1440px: both on
  the same pixel row. These pin the arithmetic that puts them there.
*/

const CSS = readFileSync(join(__dirname, "..", "app", "admin.css"), "utf8");

function rule(selector: string, from = 0): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = CSS.slice(from).match(new RegExp(`\\n${esc}\\s*\\{([^}]*)\\}`));
  expect(m, `no top-level rule for ${selector}`).not.toBeNull();
  return m![1]!;
}

describe("console header line", () => {
  it("header and brand block share one height", () => {
    expect(rule(".pba-shell")).toMatch(/--pba-head-h:\s*\d+px/);
    const header = rule(".pba-header");
    expect(header).toContain("height: var(--pba-head-h)");
    expect(header).toContain("border-bottom: 1px solid");
    // The header's border is inside its height, so the brand stops 1px short
    // and the divider takes that pixel.
    expect(rule(".pba-brand")).toContain("height: calc(var(--pba-head-h) - 1px)");
  });

  it("nothing above the brand or between it and the divider adds height", () => {
    expect(rule(".pba-side")).toMatch(/padding:\s*0\s/);
    expect(rule(".pba-brand + .pba-divider")).toContain("margin-top: 0");
    expect(rule(".pba-divider")).toContain("height: 1px");
  });
});
