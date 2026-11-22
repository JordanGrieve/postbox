import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ticketMessages } from "@/db/schema";

/**
 * Our own Message-ID, learned from the provider after a send.
 *
 * ── WHY ──
 * SES overwrites any Message-ID we set, so the id the customer's mail client
 * sees on our reply is one we never chose. lib/data's
 * backfillOutboundMessageId learns it from the customer's NEXT reply — but
 * only when that reply arrives through the per-ticket address. A reply sent
 * to replies@ (a client ignoring Reply-To) names only our message in its
 * In-Reply-To, and with that id unknown it matched no conversation. Journey
 * retest, 22 Nov 2026: "[inbound] unrouted reply: 1 referenced id(s)".
 *
 * Resend's GET /emails/{id} returns it as `message_id`. The delivery webhook
 * asks once, on the first sent/delivered event for a ticket message, and
 * stores it; findTicketByReferencedMessageIds can then match the reply.
 */

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

/** The provider's Message-ID for one of our sends, bracketed. Null on any failure. */
export async function fetchSentMessageId(
  providerMessageId: string,
  deps: { apiKey?: string; fetchFn?: FetchFn } = {},
): Promise<string | null> {
  const apiKey = deps.apiKey;
  if (!apiKey) return null;
  const fetchFn = deps.fetchFn ?? fetch;
  try {
    const res = await fetchFn(
      `https://api.resend.com/emails/${encodeURIComponent(providerMessageId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { message_id?: unknown };
    const raw = typeof body.message_id === "string" ? body.message_id.trim() : "";
    if (!raw) return null;
    return raw.startsWith("<") ? raw : `<${raw}>`;
  } catch {
    return null;
  }
}

/**
 * Store our Message-ID on the outbound ticket message this provider id names,
 * if it has none yet. Campaign sends and unknown ids are not ticket messages,
 * so they cost one indexed read and no provider call.
 */
export async function learnSentMessageId(providerMessageId: string): Promise<void> {
  const waiting = await db
    .select({ id: ticketMessages.id })
    .from(ticketMessages)
    .where(
      and(
        eq(ticketMessages.providerMessageId, providerMessageId),
        isNull(ticketMessages.messageId),
      ),
    )
    .limit(1);
  if (waiting.length === 0) return;

  const messageId = await fetchSentMessageId(providerMessageId, {
    apiKey: process.env.RESEND_API_KEY,
  });
  if (!messageId) return;

  await db
    .update(ticketMessages)
    .set({ messageId })
    .where(
      and(
        eq(ticketMessages.providerMessageId, providerMessageId),
        isNull(ticketMessages.messageId),
      ),
    );
}
