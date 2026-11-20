import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { SETTINGS_SECTIONS, settingsSectionFor } from "../lib/settings-sections";

/**
 * Every settings page belongs to exactly one sidebar section.
 *
 * From 20 Nov 2026 the sidebar shows five Settings sections and each page's
 * tabs show only its own section's pages. A page that belongs to no section is
 * reachable from nowhere — no sidebar item, no tab — which is how a screen
 * quietly disappears. So this reads the ROUTE TREE, not the list, and checks
 * the list against it.
 */

const SETTINGS_DIR = join(__dirname, "..", "app", "(dashboard)", "settings");

/** "/settings", "/settings/team", … for every directory with a page.tsx. */
function settingsRoutes(dir = SETTINGS_DIR, base = "/settings"): string[] {
  const out: string[] = [];
  if (readdirSync(dir).includes("page.tsx")) out.push(base);
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...settingsRoutes(full, `${base}/${name}`));
  }
  return out;
}

const routes = settingsRoutes();
const listed = SETTINGS_SECTIONS.flatMap((s) => s.pages.map((p) => p.href));

describe("lib/settings-sections", () => {
  it("found the settings routes", () => {
    expect(routes).toContain("/settings");
    // Nine since labels left the product; the floor only has to prove the
    // walker found the tree.
    expect(routes.length).toBeGreaterThanOrEqual(8);
  });

  it("is the five sections of the design, in its order", () => {
    expect(SETTINGS_SECTIONS.map((s) => s.label)).toEqual([
      "Your business",
      "Auto-reply",
      "Team",
      "Website & email",
      "Billing",
    ]);
  });

  it("lists every settings page that exists", () => {
    expect(routes.filter((r) => !listed.includes(r))).toEqual([]);
  });

  it("lists no page that does not exist", () => {
    expect(listed.filter((h) => !routes.includes(h))).toEqual([]);
  });

  it("puts each page in exactly one section", () => {
    const dupes = listed.filter((h, i) => listed.indexOf(h) !== i);
    expect(dupes).toEqual([]);
  });

  it("sends each sidebar item to its own first page", () => {
    for (const s of SETTINGS_SECTIONS) expect(s.href).toBe(s.pages[0]!.href);
  });

  it("finds the section for every page, and only inside Settings", () => {
    for (const s of SETTINGS_SECTIONS) {
      for (const p of s.pages) expect(settingsSectionFor(p.href)?.key, p.href).toBe(s.key);
    }
    expect(settingsSectionFor("/settings/")?.key).toBe("business");
    expect(settingsSectionFor("/settings/team/anything")?.key).toBe("team");
    expect(settingsSectionFor("/inbox")).toBeNull();
    expect(settingsSectionFor("/settingsx")).toBeNull();
    // /settings must not swallow its siblings' unknown children.
    expect(settingsSectionFor("/settings/unknown")).toBeNull();
  });
});
