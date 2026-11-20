/**
 * Postgres error recognition that survives drizzle's wrapping.
 *
 * drizzle-orm (0.45, neon-http) catches every driver error and rethrows it as
 * a DrizzleQueryError whose `cause` is the original. The SQLSTATE `code` lives
 * on that cause, so `err.code` on what a caller catches is always undefined.
 *
 * Both hash-chained logs (lib/admin-audit.ts, lib/impersonation.ts) retry a
 * lost race for the head of the chain on unique_violation. Each had its own
 * copy of a check that read `err.code` only, so the retry never ran and the
 * loser of the race threw instead. One copy now, reading the whole chain.
 */

/** SQLSTATE 23505, on the error itself or anywhere down its `cause` chain. */
export function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  // Bounded: a cause chain is short, and a cyclic one must not hang a request.
  for (let depth = 0; depth < 5 && current; depth++) {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
