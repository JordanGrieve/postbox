import { describe, it, expect } from "vitest";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { isUniqueViolation } from "../lib/pg-errors";

/**
 * The hash-chained logs retry a lost race on unique_violation. What they catch
 * is drizzle's wrapper, not the driver error, so the check has to look through
 * `cause`. It used to read `err.code` only, which is always undefined on the
 * wrapper — the retry never ran and the loser of the race threw instead.
 *
 * Built with drizzle's REAL DrizzleQueryError, so a change to how drizzle wraps
 * errors shows up here rather than in production.
 */
function driverError(code: string): Error {
  return Object.assign(new Error("duplicate key value violates unique constraint"), {
    code,
  });
}

describe("isUniqueViolation", () => {
  it("recognises 23505 as drizzle actually throws it: wrapped, with the code on cause", () => {
    const wrapped = new DrizzleQueryError("insert into admin_actions ...", [], driverError("23505"));
    expect((wrapped as { code?: unknown }).code).toBeUndefined();
    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it("recognises a bare driver error too", () => {
    expect(isUniqueViolation(driverError("23505"))).toBe(true);
  });

  it("does not retry any other failure", () => {
    expect(isUniqueViolation(new DrizzleQueryError("q", [], driverError("23503")))).toBe(false);
    expect(isUniqueViolation(new Error("network down"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });

  it("terminates on a cyclic cause chain", () => {
    const a: { cause?: unknown } = {};
    const b: { cause?: unknown } = { cause: a };
    a.cause = b;
    expect(isUniqueViolation(a)).toBe(false);
  });
});
