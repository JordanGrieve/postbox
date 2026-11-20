import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";

/**
 * No rule sets `width: 100%` together with a horizontal margin.
 *
 * Under border-box, 100% is the parent's whole content width, so any side
 * margin pushes the box that far past its parent. The onboarding checklist's
 * "Do it" button did exactly this on phones (width 100%, margin-left 32px) and
 * ran 20px past its card with the right edge cut off. Found by __overflow() on
 * the mail harness at 375px on 20 Nov 2026; nothing in CI could see it.
 *
 * Use `calc(100% - <margin>)`, or drop the width and let a block fill the line.
 *
 * Discovers every stylesheet under app/ and components/ rather than listing
 * them, and asserts it found some — see AGENTS.md, "A guard is only as wide as
 * its input".
 */

const ROOT = join(__dirname, "..");

function stylesheets(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) stylesheets(full, out);
    else if (name.endsWith(".css")) out.push(full);
  }
  return out;
}

const ZERO = /^(0|0px|0rem|auto)$/;

/** Selectors (with line) whose rule sets width:100% and a non-zero side margin. */
function fullWidthWithSideMargin(css: string, from = "inline.css"): string[] {
  const hits: string[] = [];
  postcss.parse(css, { from }).walkRules((rule) => {
    const decls = new Map<string, string>();
    rule.each((node) => {
      if (node.type === "decl") decls.set(node.prop, node.value.trim());
    });
    if (decls.get("width") !== "100%") return;
    if (decls.get("box-sizing") === "content-box") return;

    const sides: string[] = [];
    for (const prop of ["margin-left", "margin-right", "margin-inline-start", "margin-inline-end"]) {
      const v = decls.get(prop);
      if (v) sides.push(v);
    }
    for (const prop of ["margin", "margin-inline"]) {
      const v = decls.get(prop);
      if (!v) continue;
      const parts = v.split(/\s+/);
      if (prop === "margin-inline") sides.push(...parts);
      else if (parts.length >= 2) sides.push(parts[1], parts[3] ?? parts[1]);
    }
    if (sides.some((v) => !ZERO.test(v) && !v.startsWith("-"))) {
      hits.push(`${rule.selector} (line ${rule.source?.start?.line})`);
    }
  });
  return hits;
}

describe("width: 100% never comes with a side margin", () => {
  it("the detector flags the onboarding bug and clears its fix", () => {
    expect(
      fullWidthWithSideMargin(".pbo-go { width: 100%; margin-left: 32px; }"),
    ).toHaveLength(1);
    expect(
      fullWidthWithSideMargin(".x { width: 100%; margin: 0 16px; }"),
    ).toHaveLength(1);
    expect(
      fullWidthWithSideMargin(".pbo-go { width: calc(100% - 32px); margin-left: 32px; }"),
    ).toHaveLength(0);
    expect(fullWidthWithSideMargin(".x { width: 100%; margin: 12px 0; }")).toHaveLength(0);
    expect(fullWidthWithSideMargin(".x { width: 100%; margin: 0 auto; }")).toHaveLength(0);
  });

  const files = [
    ...stylesheets(join(ROOT, "app")),
    ...stylesheets(join(ROOT, "components")),
  ];

  it("found the stylesheets to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("no stylesheet has one", () => {
    const hits = files.flatMap((f) =>
      fullWidthWithSideMargin(readFileSync(f, "utf8"), f).map(
        (h) => `${f.slice(ROOT.length + 1)}: ${h}`,
      ),
    );
    expect(hits).toEqual([]);
  });
});
