import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/*
  Jordan, 17 Nov 2026: "these buttons don't conform to any we have done so
  far. go fix these and make them reusable". (The label colour tests went
  with labels, 18 Nov 2026.)
*/

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("one set of buttons", () => {
  it("globals.css has the destructive variant beside primary and secondary", () => {
    const css = read("app/globals.css");
    const danger = css.match(/\n\.stg-button--danger\s*\{([^}]*)\}/);
    expect(danger, "no .stg-button--danger").not.toBeNull();
    expect(danger![1]).toContain("background: var(--pdf-bg)");
    expect(danger![1]).toContain("color: var(--pdf-fg)");
  });

  it("no component anywhere still uses a deleted one-off confirm button", () => {
    /*
      DISCOVERED, not listed. The first version of this test named the three
      files it knew about and passed, while RecipientsPanel.tsx still used
      .nl-confirm-btn with its CSS deleted: two unstyled buttons that CodeRabbit
      caught on the PR. A guard is only as wide as its input.
    */
    const files = [
      ...readdirSync(join(ROOT, "app"), { recursive: true, encoding: "utf8" }).map((f) => join("app", f)),
      ...readdirSync(join(ROOT, "components"), { recursive: true, encoding: "utf8" }).map((f) =>
        join("components", f),
      ),
    ].filter((f) => f.endsWith(".tsx"));
    expect(files.length, "found no components to check").toBeGreaterThan(50);
    const offenders = files.filter((f) => /(pbm|nl)-confirm-btn/.test(read(f)));
    expect(offenders, "still using a deleted confirm-button class").toEqual([]);

    // And the three confirm steps really are on the shared pair. (The label
    // manager's was the fourth until labels went, 18 Nov 2026.)
    for (const f of [
      "app/(dashboard)/newsletters/AbortPanel.tsx",
      "app/(dashboard)/newsletters/CampaignList.tsx",
      "app/(dashboard)/newsletters/RecipientsPanel.tsx",
    ]) {
      const src = read(f);
      expect(src, `${f} has no danger button`).toContain('className="stg-button stg-button--danger"');
      expect(src, `${f} has no secondary button`).toContain('className="stg-button stg-button--secondary"');
    }
    for (const f of ["app/mail.css", "app/newsletter.css"]) {
      expect(read(f), `${f} still styles a one-off confirm button`).not.toMatch(/\.(pbm|nl)-confirm-btn/);
    }
  });
});
