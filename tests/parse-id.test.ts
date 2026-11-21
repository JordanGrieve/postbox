import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseId, MAX_ID } from "../lib/ids";

/**
 * Ids from requests are int4, and anything else is a 400/404, not a 500.
 *
 * Until 21 Nov 2026 each route checked Number.isInteger(Number(raw)), which
 * passes 99999999999; Postgres then threw "out of range for type integer"
 * and the route answered 500 (AUDIT-REPORT.md). lib/ids.ts parseId is the
 * one parser now.
 */
describe("parseId", () => {
  it("accepts every id an int4 serial can hold", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("41")).toBe(41);
    expect(parseId(String(MAX_ID))).toBe(MAX_ID);
    expect(parseId(7)).toBe(7);
  });

  it("refuses ids past int4, which used to reach Postgres and 500", () => {
    expect(parseId(String(MAX_ID + 1))).toBeNull();
    expect(parseId("99999999999")).toBeNull();
    expect(parseId(MAX_ID + 1)).toBeNull();
  });

  it("refuses everything that is not plain decimal digits", () => {
    for (const bad of ["0", "-4", "1e3", " 12", "12 ", "0x10", "1.5", "", "01", "abc"]) {
      expect(parseId(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(parseId(null)).toBeNull();
    expect(parseId(undefined)).toBeNull();
    expect(parseId(1.5)).toBeNull();
  });
});

/*
  Every dynamic [id] API route parses with it. Discovered from the tree, so a
  new route is checked without being listed, and asserted non-empty.
*/
const API = join(__dirname, "..", "app", "api");

function idRoutes(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) idRoutes(full, out);
    else if (name === "route.ts" && full.includes("[id]")) {
      // /api/tickets/[id] is the public ingestion endpoint; its [id] is the
      // workspace's API key, a string, not a row id.
      if (!readFileSync(full, "utf8").includes("const { id: apiKey }")) out.push(full);
    }
  }
  return out;
}

describe("the [id] API routes", () => {
  const routes = idRoutes(API);

  it("found them", () => {
    expect(routes.length).toBeGreaterThanOrEqual(8);
  });

  it("all parse their id with parseId, not Number()", () => {
    const bad = routes.filter((f) => {
      const src = readFileSync(f, "utf8");
      const uses = src.includes("parseId((await ctx.params).id)") || src.includes("const idFrom = parseId;");
      return !uses || /Number\(\(await ctx\.params\)\.id\)|Number\(raw\)/.test(src);
    });
    expect(bad.map((f) => f.slice(API.length + 1))).toEqual([]);
  });
});

/*
  The operator console's form actions and the campaign list id: the last
  hand-rolled Number() parses, moved to parseId on 21 Nov 2026.
*/
describe("other id parses", () => {
  it("the console's actions parse every id with parseId", () => {
    const src = readFileSync(join(__dirname, "..", "app", "(admin)", "admin", "actions.ts"), "utf8");
    expect(src.match(/parseId\(/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
    expect(src).not.toMatch(/Number\(formData\.get\(|Number\(store\.get\(/);
  });

  it("a campaign's audience list id is parsed with parseId", () => {
    const src = readFileSync(join(__dirname, "..", "lib", "newsletter.ts"), "utf8");
    expect(src).toContain("parseId(body.listId)");
  });
});
