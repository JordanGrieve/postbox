/**
 * A client asking Postbox to close their workspace.
 *
 * ── WHY A REQUEST AND NOT A DELETE ──
 * Closing deletes every message, subscriber and newsletter for good, and only
 * operators can do it, from the console, where it is written to the audit log
 * first (app/(admin)/admin/actions.ts). Jordan's call on 20 Nov 2026: the
 * client-facing "Close workspace" sends a request instead, and a person
 * confirms with them before anything is deleted. It can become self-serve
 * later without this screen changing shape.
 *
 * The request lands as a ticket in Postbox's OWN workspace — the one
 * POSTBOX_CONTACT_KEY points at, which is where /contact enquiries already go —
 * so it is answered from the same inbox as everything else, and the client's
 * address is on it to reply to.
 *
 * Pure: the route does the IO.
 */

export const CLOSE_REASON_MAX = 1000;

export function closureRequestTicket(input: {
  workspace: { id: number; name: string };
  requesterEmail: string;
  reason: string;
}): { subject: string; body: string } {
  const reason = input.reason.trim().slice(0, CLOSE_REASON_MAX);
  const lines = [
    `${input.requesterEmail} has asked us to close their workspace.`,
    "",
    `Workspace: ${input.workspace.name} (#${input.workspace.id})`,
    `Asked by: ${input.requesterEmail}`,
    "",
    reason ? `Their reason: ${reason}` : "They didn’t give a reason.",
    "",
    "Nothing has been deleted. Reply to confirm with them, then close it from the console.",
  ];
  return {
    subject: `Close workspace: ${input.workspace.name} (#${input.workspace.id})`,
    body: lines.join("\n"),
  };
}
