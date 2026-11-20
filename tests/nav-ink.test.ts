import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";

/**
 * --nav-active-fg is only ever ink ON --nav-active-bg.
 *
 * It is the text colour of the FILLED active row — white on near-black in the
 * light theme, near-black on near-white in dark. Used as a hover colour over
 * the sidebar's faint --nav-line wash it is white on near-white (and black on
 * near-black): about 1.1:1 in both themes. Every folder row's hover and the
 * Labels "Manage" button did exactly that until 20 Nov 2026.
 *
 * So: a rule that sets `color: var(--nav-active-fg)` must also put
 * --nav-active-bg behind it, either itself or on the same selector without its
 * :hover / :focus-visible / :not(), which is the element's resting rule.
 *
 * Discovers every stylesheet under app/ and components/ (AGENTS.md: a guard is
 * only as wide as its input).
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

const STATE = /:(hover|focus-visible|focus|active)\b|:not\([^)]*\)/g;
const ACTIVE_BG = /var\(--nav-active-bg\)/;

/** Selectors whose active-row ink has no active-row background under it. */
function strandedActiveInk(css: string): string[] {
  const root = postcss.parse(css);
  const bgBySelector = new Map<string, boolean>();
  const inked: Array<{ selector: string; ownBg: boolean }> = [];

  root.walkRules((rule) => {
    let colour = "";
    let bg = false;
    rule.each((n) => {
      if (n.type !== "decl") return;
      if (n.prop === "color") colour = n.value;
      if ((n.prop === "background" || n.prop === "background-color") && ACTIVE_BG.test(n.value)) bg = true;
    });
    for (const sel of rule.selectors) {
      if (bg) bgBySelector.set(sel.trim(), true);
      if (/var\(--nav-active-fg\)/.test(colour)) inked.push({ selector: sel.trim(), ownBg: bg });
    }
  });

  return inked
    .filter(({ selector, ownBg }) => !ownBg && !bgBySelector.get(selector.replace(STATE, "").trim()))
    .map(({ selector }) => selector);
}

describe("--nav-active-fg only sits on --nav-active-bg", () => {
  it("the detector flags the hover bug and clears the real uses", () => {
    expect(
      strandedActiveInk(".row:hover:not(:disabled) { background: var(--nav-line); color: var(--nav-active-fg); }"),
    ).toEqual([".row:hover:not(:disabled)"]);
    expect(
      strandedActiveInk('.row[data-active="true"] { background: var(--nav-active-bg); color: var(--nav-active-fg); }'),
    ).toEqual([]);
    // A hover that keeps the resting rule's filled background is fine.
    expect(
      strandedActiveInk(".pill { background: var(--nav-active-bg); color: var(--nav-active-fg); } .pill:hover { color: var(--nav-active-fg); }"),
    ).toEqual([]);
  });

  const files = [...stylesheets(join(ROOT, "app")), ...stylesheets(join(ROOT, "components"))];

  it("found the stylesheets", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("no stylesheet strands it", () => {
    const hits = files.flatMap((f) =>
      strandedActiveInk(readFileSync(f, "utf8")).map((s) => `${f.slice(ROOT.length + 1)}: ${s}`),
    );
    expect(hits).toEqual([]);
  });
});
