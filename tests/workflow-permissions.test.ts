import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every GitHub Actions workflow declares a top-level read-only token.
 *
 * A workflow with no `permissions:` block runs with the repository's default
 * token scope, which can be write. ci.yml had none until the 20 Nov 2026
 * audit; the three sweeps already declared `contents: read`. None of them
 * writes to the repository, so none needs more.
 *
 * Discovers the files rather than listing them, and asserts it found some.
 */
const DIR = join(__dirname, "..", ".github", "workflows");
const files = readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f));

describe(".github/workflows permissions", () => {
  it("found the workflows", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  for (const file of files) {
    it(`${file} declares top-level permissions: contents: read`, () => {
      const src = readFileSync(join(DIR, file), "utf8");
      // Top-level means column 0, before `jobs:`.
      const jobsAt = src.search(/^jobs:/m);
      const head = src.slice(0, jobsAt === -1 ? undefined : jobsAt);
      expect(head).toMatch(/^permissions:\s*\n\s+contents:\s*read\s*$/m);
      expect(src).not.toMatch(/:\s*write\b/);
    });
  }
});
