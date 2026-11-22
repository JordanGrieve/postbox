import type { TicketSource, TicketStatus } from "@/db/schema";

/*
  The two types the mail components share with the dashboard's queries.
  They lived in app/(dashboard)/queries.ts, which made components/ reach into
  a route folder; they moved here on 21 Nov 2026 and queries.ts imports them.
*/

/**
 * The two inbox views: "To reply" is `inbox` (open conversations) and "Done"
 * is `closed`. parseInboxView in app/(dashboard)/queries.ts reads ?folder=.
 */
export type InboxView = "inbox" | "closed";

/** One internal note about a contact, as the rail renders it. */
export type ContactNoteDTO = {
  id: number;
  body: string;
  authorLabel: string;
  createdAtIso: string;
};

/**
 * One row in the message list. Every field here is backed by a real column.
 *
 * Trimmed 19 Nov 2026 with the simple inbox: the sent time and preview (the
 * Sent folder's), awaiting/unread/starred and the labels went with the
 * interface that showed them.
 */
export type MailRow = {
  id: number;
  name: string;
  email: string;
  /** Not drawn on the card, but searched by the list's search box. */
  subject: string;
  /** First line of the customer's newest message (else the newest). Empty string when the ticket has none. */
  preview: string;
  /** Compact relative time, e.g. "12m", "3h", "2d". */
  time: string;
  source: TicketSource;
  status: TicketStatus;
  /** Searched by the list's search box. */
  orderId: string | null;
};

/** The inbox's two tab counts. Both are real COUNT(*) results. */
export type MailCountsDTO = {
  /** To reply: open conversations. */
  inbox: number;
  /** Done: closed conversations. */
  closed: number;
};

/** What the contact rail can honestly show about a person. */
export type ContactCard = {
  name: string;
  email: string;
  /** ISO date of the contacts row, or null when we never recorded one. */
  firstSeenIso: string | null;
  ticketCount: number;
};
