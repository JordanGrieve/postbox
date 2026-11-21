import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  adminActionGenesisHash,
  adminActionRowHash,
  adminChainAlert,
  verifyAdminActionChain,
  type AdminActionChainContent,
  type AdminActionChainRow,
} from "../lib/admin-actions-chain";

/**
 * The admin-action log is verified every day by the health job.
 *
 * Until 21 Nov 2026 the chain was written on every action and checked by
 * nothing (AUDIT-REPORT.md), so tampering would never have been seen. Jordan
 * chose the daily health job over the console. These pin the decision (what
 * is an alert) on real chains, and that the job actually makes it.
 */

const SECRET = "test-secret";

function chain(n: number): AdminActionChainRow[] {
  const rows: AdminActionChainRow[] = [];
  let prev = adminActionGenesisHash(SECRET);
  for (let i = 1; i <= n; i++) {
    const content = {
      action: "workspace_exported",
      actorAdminId: 1,
      actorEmail: "ops@postbox.help",
      targetId: 10 + i,
      targetLabel: `Workspace ${i}`,
      detail: null,
      createdAt: new Date(Date.UTC(2026, 10, i, 9)),
    } satisfies AdminActionChainContent;
    const hash = adminActionRowHash(content, prev, SECRET);
    rows.push({ id: i, ...content, chainPrevHash: prev, chainHash: hash });
    prev = hash;
  }
  return rows;
}

describe("adminChainAlert", () => {
  it("raises nothing for an intact chain", () => {
    const v = verifyAdminActionChain(chain(3), SECRET);
    expect(v.ok).toBe(true);
    expect(adminChainAlert(v)).toBeNull();
  });

  it("raises an error naming the row when a row has been edited", () => {
    const rows = chain(3);
    rows[1] = { ...rows[1]!, actorEmail: "someone-else@postbox.help" };
    const alert = adminChainAlert(verifyAdminActionChain(rows, SECRET));
    expect(alert?.level).toBe("error");
    expect(alert?.fingerprint).toBe("admin-action-chain-broken");
    expect(alert?.detail).toMatch(/#2/);
  });

  it("raises a warning, not an error, when the log could not be read", () => {
    const alert = adminChainAlert({
      ok: false,
      keyed: true,
      total: 0,
      legacyUnverified: 0,
      verified: 0,
      firstBreak: null,
      note: "The action log could not be read, so nothing was verified.",
    });
    expect(alert?.level).toBe("warning");
    expect(alert?.detail).toMatch(/could not be read/);
  });
});

describe("app/api/cron/health", () => {
  const src = readFileSync(
    join(__dirname, "..", "app", "api", "cron", "health", "route.ts"),
    "utf8",
  );

  it("verifies the admin action log and passes the result to adminChainAlert", () => {
    expect(src).toMatch(/await verifyAdminActionLog\(\)/);
    expect(src).toMatch(/adminChainAlert\(chain\)/);
    expect(src).toMatch(/Sentry\.captureMessage\(chainAlert\.title/);
  });
});
