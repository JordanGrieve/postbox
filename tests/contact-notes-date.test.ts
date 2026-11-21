import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A note's date renders the same on the server and in the browser.
 *
 * formatNoteDate used the runtime's own time zone, so a note written near
 * midnight UTC showed one date from the server and another after hydration in
 * a browser elsewhere, and React reported the mismatch (AUDIT-REPORT.md).
 * Fixed 21 Nov 2026 by naming the zone. Source-level because the runner's
 * own zone decides whether a render test could ever see the difference.
 */
describe("ContactNotes dates", () => {
  const src = readFileSync(join(__dirname, "..", "components", "mail", "ContactNotes.tsx"), "utf8");

  it("formats the note date in a named zone, not the runtime's", () => {
    const fn = src.slice(src.indexOf("function formatNoteDate"));
    expect(fn.length).toBeGreaterThan(0);
    expect(fn.slice(0, fn.indexOf("\n}"))).toMatch(/timeZone: "UTC"/);
  });
});
