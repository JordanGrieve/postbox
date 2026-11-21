import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/viewer", () => ({ currentImpersonation: vi.fn() }));
vi.mock("@/lib/admin-audit", () => ({ recordAdminAction: vi.fn() }));

import { recordOperatorAction, OPERATOR_RECORD_FAILED } from "../lib/operator-actions";
import type { ImpersonationContext } from "../lib/viewer";
import type { Workspace } from "../db/schema";

/**
 * What a Postbox operator does inside a client's workspace is recorded.
 *
 * Until 21 Nov 2026 only exports were: an operator could reply to a client's
 * customer, send a newsletter or change a setting, and neither the client's
 * access log nor our console said so. Jordan's call: keep the full
 * experience, record each one, before it happens, and refuse if the record
 * cannot be written (AUDIT-REPORT.md).
 */

const operator = {
  workspace: { id: 7, name: "Open Door Bakery" } satisfies Partial<Workspace> as Workspace,
  operatorEmail: "ops@postbox.help",
  session: null,
} satisfies ImpersonationContext;

describe("recordOperatorAction", () => {
  it("records nothing, and lets a client through, outside an impersonation", async () => {
    const record = vi.fn();
    const out = await recordOperatorAction("operator_replied", "x", {
      current: async () => null,
      record,
    });
    expect(out).toBeNull();
    expect(record).not.toHaveBeenCalled();
  });

  it("records an operator's action against the workspace, then lets it through", async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const out = await recordOperatorAction("operator_replied", "Replied in conversation TKT-41", {
      current: async () => operator,
      record,
    });
    expect(out).toBeNull();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "operator_replied",
        actorEmail: "ops@postbox.help",
        targetId: 7,
        targetLabel: "Open Door Bakery",
        detail: "Replied in conversation TKT-41",
      }),
    );
  });

  it("refuses the action when the record cannot be written", async () => {
    const out = await recordOperatorAction("operator_settings_changed", "x", {
      current: async () => operator,
      record: vi.fn().mockRejectedValue(new Error("db down")),
    });
    expect(out).toBe(OPERATOR_RECORD_FAILED);
  });
});

/*
  Every path that lets an operator reply, send or change a setting records it
  BEFORE the write it guards. Source-level, because these are routes and
  server actions over a database the unit suite does not have.
*/
const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const PATHS: [file: string, kind: string, write: string][] = [
  ["app/api/tickets/[id]/reply/route.ts", "operator_replied", "sendReplyEmail("],
  ["app/api/campaigns/[id]/schedule/route.ts", "operator_campaign_sent", "scheduleCampaign(workspace.id"],
  ["app/api/workspace/route.ts", "operator_settings_changed", "updateWorkspace(workspace.id"],
  ["app/api/auto-reply/route.ts", "operator_settings_changed", "saveAutoReplyConfig(workspace.id"],
  ["app/api/welcome/route.ts", "operator_settings_changed", "upsertWelcomeEmail(workspace.id"],
  ["app/(dashboard)/settings/team/actions.ts", "operator_settings_changed", "db.insert(agents)"],
];

describe("every operator write path records first", () => {
  for (const [file, kind, write] of PATHS) {
    it(`${file} records ${kind} before ${write}`, () => {
      const src = read(file);
      const recordAt = src.search(new RegExp(`recordOperatorAction\\(\\s*"${kind}"`));
      const writeAt = src.indexOf(write);
      expect(recordAt, "records the action").toBeGreaterThan(-1);
      expect(writeAt, "found the write").toBeGreaterThan(-1);
      expect(recordAt).toBeLessThan(writeAt);
    });
  }

  it("every forms action records before it writes", () => {
    const src = read("app/(dashboard)/settings/forms/actions.ts");
    const writes = ["createForm({", "renameForm({", "revokeFormKey({", "regenerateFormKey({"];
    for (const w of writes) {
      const at = src.indexOf(`  await ${w}`);
      expect(at, w).toBeGreaterThan(-1);
      const before = src.slice(0, at);
      const lastRecord = before.lastIndexOf("await recordedOrThrow(");
      const lastFn = before.lastIndexOf("export async function");
      expect(lastRecord, `${w} is preceded by a record in its own function`).toBeGreaterThan(lastFn);
    }
  });
});
