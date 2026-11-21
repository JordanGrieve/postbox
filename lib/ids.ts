/**
 * A database id from a URL segment, a form field or a JSON body, or null.
 *
 * Every id column here is a Postgres `serial`, a 32-bit integer. The routes
 * each wrote `Number(raw)` and `Number.isInteger(n)`, which lets through
 * 99999999999 (an integer, just not an int4) and the query then failed with
 * "out of range for type integer": a 500 for what is simply a wrong address
 * (AUDIT-REPORT.md, 21 Nov 2026). It also accepted "1e3", " 12 ", "0x10",
 * "-4" and "0", none of which any of our URLs ever contain.
 *
 * Plain decimal digits, 1 to 2,147,483,647. Anything else is null, and the
 * caller answers it as a bad request or not found, never as a crash.
 */
export const MAX_ID = 2_147_483_647;

export function parseId(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw >= 1 && raw <= MAX_ID ? raw : null;
  }
  if (typeof raw !== "string" || !/^[1-9][0-9]{0,9}$/.test(raw)) return null;
  const n = Number(raw);
  return n <= MAX_ID ? n : null;
}
