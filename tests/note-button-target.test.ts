import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
  22 Nov 2026 gap run: "Save note" was 31px tall, under the product's 44px
  (2.5.5, STYLE-GUIDE §4). It only appears once a note is typed, so no page
  sweep had ever seen it — which is why this reads the stylesheet instead.
*/
describe("the Save note button", () => {
  it("is at least --tap-min tall", () => {
    const css = readFileSync(join(process.cwd(), "app/mail.css"), "utf8");
    const rule = /\.pbn-add\s*\{([^}]*)\}/.exec(css);
    expect(rule, "no .pbn-add rule in app/mail.css").not.toBeNull();
    expect(rule?.[1]).toMatch(/min-height:\s*var\(--tap-min,\s*44px\)/);
  });
});
