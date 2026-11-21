import { auth } from "@clerk/nextjs/server";
import { json } from "@/lib/http";
import { parseId } from "@/lib/ids";
import { rateLimitDurable } from "@/lib/rate-limit-store";
import { getTicket, getMessages, addMessage } from "@/lib/data";
import { activeWorkspace } from "@/lib/viewer";
import { recordOperatorAction } from "@/lib/operator-actions";
import { sendReplyEmail } from "@/lib/email";
import { buildReplyTo } from "@/lib/tickets";
import { EMAIL_FROM_ADDRESS } from "@/lib/config";

/**
 * POST /api/tickets/:id/reply  (authed)
 * Body: { message }
 * Sends a real email from the workspace's address with a per-ticket Reply-To,
 * then saves an outbound message and moves the ticket to Done (closed) — or,
 * if the email did not leave, keeps it in To reply (in progress).
 */
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/tickets/[id]/reply">,
) {
  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

  // int4 digits only (lib/ids.ts): 99999999999 used to reach Postgres and 500.
  const ticketId = parseId((await ctx.params).id);
  if (ticketId === null) {
    return json({ error: "Invalid ticket id" }, { status: 400 });
  }

  let body: { message?: string };
  try {
    body = (await req.json()) as { message?: string };
  } catch {
    body = {};
  }
  const message = (body.message ?? "").trim();
  if (!message) {
    return json({ error: "Message is required." }, { status: 400 });
  }
  if (message.length > 10_000) {
    return json(
      { error: "Message is too long (10,000 character max)." },
      { status: 400 },
    );
  }

  const workspace = await activeWorkspace();
  if (!workspace) {
    return json({ error: "Select a client workspace first." }, { status: 400 });
  }

  // Replies send real email from our domain — cap the blast radius of a
  // compromised or runaway account.
  const limit = await rateLimitDurable(`reply:${workspace.id}`, { max: 30 });
  if (!limit.ok) {
    return json(
      { error: "Too many replies at once — try again in a minute." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }
  const ticket = await getTicket(workspace.id, ticketId);
  if (!ticket) return json({ error: "Not found" }, { status: 404 });

  // A Postbox operator replying as the client is recorded first, or refused.
  const unrecorded = await recordOperatorAction(
    "operator_replied",
    `Replied in conversation TKT-${ticket.id}`,
  );
  if (unrecorded) return json({ error: unrecorded }, { status: 503 });

  // Threading: reference only REAL delivered Message-IDs — the customer's own
  // (captured by the inbound webhook) and ours learned from their replies'
  // In-Reply-To (SES overwrites any Message-ID we set, so we can't mint ids).
  // The customer's mail client threads on ids it has seen, so this groups the
  // conversation on their side.
  const { messages: history } = await getMessages(ticket.id);
  const chain = history
    .map((m) => m.messageId)
    .filter((id): id is string => !!id);

  // Send the email (best-effort — the outbound message is saved regardless so
  // the thread stays accurate even if delivery is misconfigured in dev).
  // From is always our verified domain; the workspace name is the display name.
  const emailResult = await sendReplyEmail({
    workspaceId: workspace.id,
    from: EMAIL_FROM_ADDRESS,
    fromName: workspace.name,
    to: ticket.customerEmail,
    subject: ticket.subject.startsWith("Re:")
      ? ticket.subject
      : `Re: ${ticket.subject}`,
    text: message,
    replyTo: buildReplyTo(ticket.id, ticket.replyToken),
    threading: {
      inReplyTo: chain.at(-1),
      // Keep the header a sane size on long tickets: first + last few.
      references: chain.length > 8 ? [chain[0], ...chain.slice(-7)] : chain,
    },
  });

  if (emailResult.error) {
    console.error("[reply] email for ticket %d not sent: %s", ticket.id, emailResult.error);
  }

  const saved = await addMessage({
    ticketId: ticket.id,
    direction: "outbound",
    body: message,
    /*
      Replying moves the conversation to Done — Jordan's mockup, 19 Nov 2026:
      "Sends as {business} and moves this to Done. If they write back, it
      comes back to To reply." The coming back is the inbound route's
      existing `status: "open"` on a customer reply.

      Only when the email actually LEFT. A reply that failed to send stays in
      To reply (in_progress), so a message the customer never received is not
      filed away as handled.
    */
    status: emailResult.sent
      ? "closed"
      : ticket.status === "closed"
        ? "closed"
        : "in_progress",
    /*
     * Both of these are known here and nowhere else afterwards.
     *
     * The provider id is the ONLY key a delivery webhook can match on — it was
     * being thrown away, which is what made every transactional bounce
     * unattributable by construction.
     *
     * 'failed' rather than leaving it null when the send errored: null means
     * "not applicable" on this column, so a failed send with a null status is
     * indistinguishable from an inbound message, and the thread would show
     * nothing at all about a reply that never left.
     */
    providerMessageId: emailResult.sent ? (emailResult.id ?? null) : null,
    deliveryStatus: emailResult.sent ? "sent" : "failed",
  });

  return json(
    {
      ok: true,
      message: saved,
      emailSent: emailResult.sent,
      // Plain words for the browser; the provider's error is logged below
      // rather than returned (21 Nov 2026).
      ...(emailResult.error
        ? { emailWarning: "Saved, but the email could not be sent to the customer." }
        : {}),
    },
    { status: 201 },
  );
}
