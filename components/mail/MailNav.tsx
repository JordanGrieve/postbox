import { activeWorkspace } from "@/lib/viewer";
import { getWorkspaceEntitlement } from "@/lib/billing-query";
import { planCard } from "@/lib/trial";
import MailNavShell from "./MailNavShell";
import type { MailCountsDTO } from "./types";

/**
 * Server half of the navigation column.
 *
 * Reads the one thing the dashboard layout does not pass: the workspace's
 * entitlement, for the plan card. (It also read the labels and the viewer's
 * agent id until 18 Nov 2026, when labels, Unread and Starred left the nav.)
 * `activeWorkspace()` is request-cached.
 */
export default async function MailNav({
  workspaceName,
  userLabel,
  counts,
  isAdmin = false,
}: {
  workspaceName: string;
  userLabel: string;
  counts: MailCountsDTO;
  isAdmin?: boolean;
}) {
  const workspace = await activeWorkspace();
  const ent = workspace ? await getWorkspaceEntitlement(workspace.id) : null;

  /*
    Null entitlement means no workspace, or a workspace row that has gone
    missing — the same fail-open case getWorkspaceEntitlement documents. The
    card is left out rather than guessed at: it is a statement about what
    somebody is paying, and inventing one is worse than showing none.
  */
  const billing = ent ? planCard(ent) : null;

  return (
    <MailNavShell
      workspaceName={workspaceName}
      userLabel={userLabel}
      counts={counts}
      billing={billing}
      isAdmin={isAdmin}
    />
  );
}
