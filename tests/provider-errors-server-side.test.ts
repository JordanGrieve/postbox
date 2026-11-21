import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * An email provider's raw error text is logged, never returned to the browser.
 *
 * Three routes returned it until 21 Nov 2026 (AUDIT-REPORT.md, "Left for
 * later"): it can name our sending account, region or configuration. Each now
 * logs the detail and returns a plain message. Source-level: these routes
 * call a provider the unit suite cannot.
 */

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");

/** Every json({...}) call's argument text in a file. */
function jsonBodies(src: string): string[] {
  const out: string[] = [];
  let at = src.indexOf("json(");
  while (at !== -1) {
    out.push(src.slice(at, src.indexOf(");", at)));
    at = src.indexOf("json(", at + 5);
  }
  expect(out.length, "found the responses").toBeGreaterThan(0);
  return out;
}

describe("provider error text stays server-side", () => {
  it("campaign test-send logs the provider message and does not return it", () => {
    const src = read("app", "api", "campaigns", "[id]", "test-send", "route.ts");
    for (const body of jsonBodies(src)) expect(body).not.toContain("${message}");
    expect(src).toContain('console.error("[test-send] delivery failed:", message)');
  });

  it("reply logs the send error and returns a plain warning", () => {
    const src = read("app", "api", "tickets", "[id]", "reply", "route.ts");
    expect(src).not.toMatch(/emailWarning: emailResult\.error/);
    expect(src).toMatch(/console\.error\([^)]*emailResult\.error\)/);
  });

  it("welcome test logs the detail and does not return it", () => {
    const src = read("app", "api", "welcome", "test", "route.ts");
    for (const body of jsonBodies(src)) expect(body).not.toContain("result.detail");
    expect(src).toMatch(/console\.error\([^)]*result\.detail\)/);
  });
});
