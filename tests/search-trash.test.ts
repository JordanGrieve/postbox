import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Search leaves out Trash, like every folder does.
 *
 * Until 21 Nov 2026 a trashed conversation still came back from search and
 * linked to ?folder=all, where it does not appear (AUDIT-REPORT.md, Jordan's
 * call to exclude it). Both legs that read tickets carry the predicate: the
 * ticket leg, and the message leg through its join.
 *
 * Source-level, like tests/tenancy-invariants.test.ts, because the unit suite
 * has no database. It finds each leg by its key and fails if it cannot.
 */

const src = readFileSync(join(__dirname, "..", "lib", "search.ts"), "utf8");

/** The text of one leg of searchQueries(): from `<key>: db` to the next leg. */
function leg(key: string, next: string): string {
  const start = src.indexOf(`    ${key}: db`);
  const end = src.indexOf(`    ${next}: db`, start + 1);
  expect(start, `found the ${key} leg`).toBeGreaterThan(-1);
  expect(end, `found the end of the ${key} leg`).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("search excludes trashed conversations", () => {
  it("the ticket leg requires deleted_at IS NULL", () => {
    expect(leg("tickets", "messages")).toMatch(/isNull\(tickets\.deletedAt\)/);
  });

  it("the message leg requires its ticket not be trashed", () => {
    expect(leg("messages", "contacts")).toMatch(/isNull\(tickets\.deletedAt\)/);
  });
});
