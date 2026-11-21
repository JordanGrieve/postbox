import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { looksLikeEmail } from "../lib/email-address";

/**
 * The one email-shape check (lib/email-address.ts), and that nobody keeps a
 * private copy of it.
 *
 * Four byte-identical copies of the pattern lived in lib/ until 21 Nov 2026.
 * A pattern that loses its backslashes still parses (AGENTS.md, 30 Aug 2026),
 * so the behaviour is pinned on inputs that only the real pattern sorts
 * correctly: without the escaped dot "a@b" passes, without the escaped
 * whitespace class an address with a space passes.
 */
describe("looksLikeEmail", () => {
  it("accepts ordinary addresses", () => {
    for (const ok of ["marcus@example.com", "a.b+tag@shop.co.uk", "x@y.io"]) {
      expect(looksLikeEmail(ok), ok).toBe(true);
    }
  });

  it("rejects junk, including the cases a mangled pattern would let through", () => {
    for (const bad of ["", "plain", "a@b", "a b@example.com", "a@exa mple.com", "@example.com", "a@@example.com", "a@example."]) {
      expect(looksLikeEmail(bad), bad).toBe(false);
    }
  });
});

describe("one copy of the pattern", () => {
  const PATTERN = "[^\\s@]+@[^\\s@]+\\.[^\\s@]+";

  for (const file of ["lib/newsletter.ts", "lib/team.ts", "lib/auto-reply-guards.ts", "lib/http.ts"]) {
    it(`${file} imports it rather than restating it`, () => {
      const src = readFileSync(join(__dirname, "..", file), "utf8");
      expect(src).not.toContain(PATTERN);
      expect(src).toMatch(/from "\.\/email-address"/);
    });
  }
});
