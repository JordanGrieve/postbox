import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  recordInvalidKey,
  INVALID_KEY_RECORDS_PER_MINUTE,
} from "../lib/ingestion-log";

/**
 * Unknown-key rejections on the public ingest routes are recorded, but not
 * without limit.
 *
 * The routes look the key up before any of their rate limits run, so this
 * branch had no throttle: `cli_<random12>` wrote a new ingestion_failures row
 * per request, from anyone. Recording is now gated per IP; the 401 is not.
 */

/** A limiter that allows the first `allow` calls per bucket, like the real one. */
function countingLimiter(allow: number) {
  const seen = new Map<string, number>();
  return vi.fn(async (bucket: string) => {
    const n = (seen.get(bucket) ?? 0) + 1;
    seen.set(bucket, n);
    return { ok: n <= allow };
  });
}

describe("recordInvalidKey", () => {
  it("records while the IP is under its limit and stops recording after", async () => {
    const limit = countingLimiter(INVALID_KEY_RECORDS_PER_MINUTE);
    const record = vi.fn(async () => {});

    for (let i = 0; i < INVALID_KEY_RECORDS_PER_MINUTE + 25; i++) {
      await recordInvalidKey(`cli_random${i}xyzabc`, "203.0.113.9", { limit, record });
    }

    expect(record).toHaveBeenCalledTimes(INVALID_KEY_RECORDS_PER_MINUTE);
    expect(record).toHaveBeenCalledWith({ reason: "invalid_key", key: "cli_random0xyzabc" });
  });

  it("limits each IP separately, so one flood does not hide another site's stale key", async () => {
    const limit = countingLimiter(1);
    const record = vi.fn(async () => {});

    await recordInvalidKey("cli_aaaaaaaaaaaa", "203.0.113.9", { limit, record });
    await recordInvalidKey("cli_bbbbbbbbbbbb", "203.0.113.9", { limit, record });
    await recordInvalidKey("cli_cccccccccccc", "198.51.100.4", { limit, record });

    expect(record).toHaveBeenCalledTimes(2);
    expect(limit.mock.calls.map((c) => c[0])).toEqual([
      "badkey:ip:203.0.113.9",
      "badkey:ip:203.0.113.9",
      "badkey:ip:198.51.100.4",
    ]);
  });

  it("records nothing, and does not throw, when the limiter itself fails", async () => {
    const limit = vi.fn(async () => {
      throw new Error("database unreachable");
    });
    const record = vi.fn(async () => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      recordInvalidKey("cli_aaaaaaaaaaaa", "203.0.113.9", { limit, record }),
    ).resolves.toBeUndefined();
    expect(record).not.toHaveBeenCalled();
    err.mockRestore();
  });
});

describe("the public ingest routes use it", () => {
  for (const route of ["app/api/tickets/[id]/route.ts", "app/api/subscribe/[key]/route.ts"]) {
    it(`${route} records unknown keys through recordInvalidKey only`, () => {
      const src = readFileSync(join(__dirname, "..", route), "utf8");
      expect(src).toContain("recordInvalidKey(");
      expect(src).not.toMatch(/reason:\s*"invalid_key"/);
    });
  }
});
