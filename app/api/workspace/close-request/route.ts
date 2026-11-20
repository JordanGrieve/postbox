import { auth } from "@clerk/nextjs/server";
import { json } from "@/lib/http";
import { resolveViewer } from "@/lib/viewer";
import { rateLimitDurable } from "@/lib/rate-limit-store";
import { POSTBOX_CONTACT_KEY } from "@/lib/config";
import { resolveIngestKey } from "@/lib/forms";
import { createTicket, upsertContact } from "@/lib/data";
import { notifyWorkspace } from "@/lib/notify";
import { CLOSE_REASON_MAX, closureRequestTicket } from "@/lib/close-request";

/**
 * POST /api/workspace/close-request  (authed)
 * Body: { reason?: string }
 *
 * Asks Postbox to close the caller's workspace. Deletes nothing: it files a
 * ticket in Postbox's own inbox for a person to confirm and act on. See
 * lib/close-request.ts for why.
 *
 * The workspace is the caller's own, re-resolved from the session; nothing in
 * the body names one. Operators are refused: they close workspaces from the
 * console, where the deletion is audited.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

  const viewer = await resolveViewer();
  if (viewer.isAdmin) {
    return json(
      { error: "You’re signed in as Postbox staff — close workspaces from the console." },
      { status: 403 },
    );
  }
  if (!viewer.workspace) return json({ error: "No workspace" }, { status: 403 });
  const workspace = viewer.workspace;
  // The request is answered by email; an account with no verified address
  // ("" — see lib/clerk-email.ts) has nowhere for the answer to go.
  if (!viewer.email) {
    return json(
      { error: "Your account has no verified email address for us to reply to." },
      { status: 400 },
    );
  }

  // A request is a ticket and an email to us; three an hour is plenty for
  // somebody who changed their mind twice.
  const limit = await rateLimitDurable(`close-request:${workspace.id}`, {
    max: 3,
    windowMs: 60 * 60_000,
  });
  if (!limit.ok) {
    return json(
      { error: "We’ve already got your request — we’ll be in touch soon." },
      { status: 429 },
    );
  }

  let reason = "";
  try {
    const body = (await req.json()) as { reason?: unknown };
    if (typeof body.reason === "string") reason = body.reason.slice(0, CLOSE_REASON_MAX);
  } catch {
    // No body is fine: the reason is optional.
  }

  const target = POSTBOX_CONTACT_KEY ? await resolveIngestKey(POSTBOX_CONTACT_KEY) : null;
  if (!target?.workspace) {
    return json(
      { error: "We couldn’t send that just now. Please get in touch through the contact page." },
      { status: 503 },
    );
  }

  const { subject, body } = closureRequestTicket({
    workspace: { id: workspace.id, name: workspace.name },
    requesterEmail: viewer.email,
    reason,
  });

  await upsertContact(target.workspace.id, workspace.name, viewer.email);
  const ticket = await createTicket({
    workspaceId: target.workspace.id,
    source: "contact_form",
    customerName: workspace.name,
    customerEmail: viewer.email,
    subject,
    body,
  });
  // Best-effort, like every notification: the ticket is the record.
  await notifyWorkspace({ workspace: target.workspace, ticket, kind: "new", body });

  return json({ ok: true });
}
