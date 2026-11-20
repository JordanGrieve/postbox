import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A label's ticket count leaves out trashed tickets, like every inbox count.
 *
 * The inbox counts exclude deleted tickets (notDeleted in
 * app/(dashboard)/queries.ts). The label count in search did not, so a label
 * whose tickets had been trashed still reported them. (The nav badge had the
 * same defect until labels left the sidebar with the simple inbox, which
 * removed lib/labels.ts; search still lists labels with a count.)
 *
 * Source-level, like tests/tenancy-invariants.test.ts, because the unit suite
 * has no database. It finds every count subquery over ticket_labels in the
 * files that build one and requires the trash predicate in each — and first
 * proves it found them, so it cannot pass by matching nothing.
 */

const FILES = ["lib/search.ts"];

/** The body of every `SELECT count(*)` subquery that reads ticket_labels. */
function labelCountSubqueries(src: string): string[] {
  const out: string[] = [];
  const re = /SELECT count\(\*\)::int\s+FROM ticket_labels[\s\S]*?\)`/g;
  for (const m of src.matchAll(re)) out.push(m[0]);
  return out;
}

describe("label ticket counts exclude trashed tickets", () => {
  for (const file of FILES) {
    const src = readFileSync(join(__dirname, "..", file), "utf8");
    const counts = labelCountSubqueries(src);

    it(`${file}: finds its label count subquery`, () => {
      expect(counts.length).toBeGreaterThan(0);
    });

    it(`${file}: every label count requires deleted_at IS NULL`, () => {
      for (const body of counts) {
        expect(body).toMatch(/t\.deleted_at IS NULL/);
      }
    });
  }
});
