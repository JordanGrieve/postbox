import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Tapping a text box must not zoom the page (Jordan, 22 Nov 2026: "on phone
 * and i hit to send a message, the zoom in is crazy, it should just be like
 * its on whatsapp").
 *
 * iOS Safari zooms into any focused field whose text is under 16px, and the
 * reply box was 0.84375rem (13.5px). The fix is 1rem text on touch screens,
 * NOT maximum-scale=1 in the viewport: that would also stop people pinching to
 * enlarge text, which 1.4.4 forbids and the product is held to at AAA.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("text fields on a touch screen", () => {
  it("are at least 1rem, so focusing one never zooms the page", () => {
    const css = read("app/globals.css");
    const block = /@media \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(block, "no touch-screen rule for text fields").toMatch(/textarea/);
    expect(block).toMatch(/input/);
    expect(block).toMatch(/select/);
    expect(block).toMatch(/font-size:\s*1rem\s*!important/);
  });

  it("are not fixed by forbidding zoom", () => {
    const layout = read("app/layout.tsx");
    expect(layout).not.toMatch(/maximumScale|maximum-scale|userScalable|user-scalable/);
  });
});
