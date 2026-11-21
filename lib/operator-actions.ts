import "server-only";
import type { AdminActionKind } from "@/db/schema";
import { recordAdminAction } from "./admin-audit";
import { currentImpersonation, type ImpersonationContext } from "./viewer";

/**
 * Record what a Postbox operator DOES inside a client's workspace.
 *
 * ── WHY ──
 * Operators keep the full experience while impersonating — they can reply,
 * send newsletters and change settings, as the client would. Until 21 Nov
 * 2026 none of that was recorded (only whole-workspace exports were), so a
 * customer could receive a reply nobody at the client wrote, and neither the
 * client's access log nor our console would say so. Jordan's call: keep the
 * experience, record every one (AUDIT-REPORT.md, "Needs your decision").
 *
 * ── BEFORE, AND REFUSING IF IT CANNOT ──
 * Same rule as the export route: the row is written BEFORE the action, and if
 * it cannot be written the action does not happen. An action with no record
 * is exactly the thing this exists to prevent, and a write that fails is rare
 * and retryable. So the row means "attempted"; the action's own result is in
 * the product (the reply in the thread, the campaign's status).
 *
 * A client acting in their own workspace is not recorded:
 * currentImpersonation() is null for them.
 *
 * Returns null to go ahead, or the message to refuse with.
 */
export type OperatorActionKind = Extract<
  AdminActionKind,
  "operator_replied" | "operator_campaign_sent" | "operator_settings_changed"
>;

export const OPERATOR_RECORD_FAILED =
  "Could not record this in the client's access log, so it has not been done. Try again.";

type Deps = {
  current: () => Promise<ImpersonationContext | null>;
  record: typeof recordAdminAction;
};

export async function recordOperatorAction(
  action: OperatorActionKind,
  /** Which conversation, campaign or setting, in words a client would use. */
  detail: string,
  // Resolved at call time, not module load, so a harness that mocks
  // lib/viewer without this export can still import the pages that use it.
  deps: Deps = { current: currentImpersonation, record: recordAdminAction },
): Promise<string | null> {
  const impersonation = await deps.current();
  if (!impersonation) return null;
  try {
    await deps.record({
      action,
      actorAdminId: impersonation.session?.adminId ?? null,
      actorEmail: impersonation.operatorEmail ?? "unknown",
      targetId: impersonation.workspace.id,
      targetLabel: impersonation.workspace.name,
      detail,
    });
    return null;
  } catch (err) {
    console.error(`[operator-actions] refusing ${action}: could not record it:`, err);
    return OPERATOR_RECORD_FAILED;
  }
}
