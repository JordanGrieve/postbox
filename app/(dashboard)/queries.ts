import "server-only";
import { cache } from "react";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  tickets,
  contacts,
  contactNotes,
  type TicketSource,
  type TicketStatus,
} from "@/db/schema";
import { TICKETS_PAGE_SIZE } from "@/lib/data";
import { previewText, relativeTime } from "@/lib/tickets";
import type { MailRow } from "@/components/mail/types";

/**
 * Reads the mail client needs that lib/data.ts does not expose.
 *
 * TENANCY. Every query below starts from `tickets` (or `contacts` /
 * `contact_notes`) and filters on the workspace id. ticket_messages has no
 * workspace column of its own, so it is only ever reached as a correlated
 * subquery hanging off `tickets.id` inside a statement whose outer WHERE
 * already pins the workspace — that outer predicate is what makes it safe.
 *
 * ── TWO VIEWS, NOT ELEVEN FOLDERS (18–19 Nov 2026) ──
 * The simple inbox offers To reply (`inbox`: open) and Done (`closed`), and
 * nothing else. The other nine folders (unread, awaiting, starred, labelled,
 * sent, archived, snoozed, trash, all) and the per-agent read, star and label
 * state behind them were removed with the interface that showed them. Their
 * columns and tables are untouched; only the reads went.
 */

/**
 * The inbox's two tabs (18 Nov 2026): "To reply" is `inbox` (open
 * conversations) and "Done" is `closed`. The only views the interface
 * offers; any other ?folder= lands on To reply rather than on a list nobody
 * can navigate out of.
 */
export type InboxView = "inbox" | "closed";

export function parseInboxView(value: string | undefined): InboxView {
  return value === "closed" ? "closed" : "inbox";
}

/**
 * A literal reference to the outer ticket's id, for use inside the correlated
 * subquery below.
 *
 * NOT a Drizzle Column reference. Drizzle renders one unqualified — plain
 * `"id"` — when it is a top-level field of a single-table select, and the
 * subquery selects FROM ticket_messages, which also has an `id`. Postgres then
 * binds the bare `"id"` to the INNER table, so `m.ticket_id = "id"` quietly
 * becomes `m.ticket_id = m.id` and the row gets somebody else's message.
 * Spelling the reference out removes the dependence on where the fragment
 * happens to land.
 */
const outerTicketId = sql.raw(`"tickets"."id"`);

const notClosed = sql`${tickets.status} != 'closed'`;
const isClosed = sql`${tickets.status} = 'closed'`;

/** Live, i.e. not soft-deleted. Deleted tickets appear in neither view. */
const notDeleted = sql`${tickets.deletedAt} IS NULL`;

/*
  NOT filtered on archived_at or snoozed_until (18 Nov 2026). Archive and
  snooze left the interface with the simple inbox, so nothing can undo
  either; a ticket archived or snoozed before then would have vanished from
  To reply for good. tests/simple-inbox.test.tsx pins this.
*/
function viewWhere(workspaceId: number, view: InboxView): SQL | undefined {
  return and(
    eq(tickets.workspaceId, workspaceId),
    notDeleted,
    view === "closed" ? isClosed : notClosed,
  );
}

export type MailCounts = {
  /** To reply: open conversations. */
  inbox: number;
  /** Done: closed conversations. */
  closed: number;
};

/**
 * Both tab counts in one round trip. Cached per request: the dashboard layout
 * (the nav's Inbox count), the list pane and the thread pane all ask.
 */
export const mailCounts = cache(
  async (workspaceId: number): Promise<MailCounts> => {
    const [row] = await db
      .select({
        inbox: sql<number>`(count(*) FILTER (WHERE ${notDeleted} AND ${notClosed}))::int`,
        closed: sql<number>`(count(*) FILTER (WHERE ${notDeleted} AND ${isClosed}))::int`,
      })
      .from(tickets)
      .where(eq(tickets.workspaceId, workspaceId));

    return { inbox: row?.inbox ?? 0, closed: row?.closed ?? 0 };
  },
);

/**
 * Only the columns the list pane draws. Deliberately NOT `typeof
 * tickets.$inferSelect` — a column added to the schema should not silently
 * become part of this shape.
 */
export type TicketListRow = {
  id: number;
  source: TicketSource;
  orderId: string | null;
  customerName: string;
  customerEmail: string;
  subject: string;
  status: TicketStatus;
  updatedAt: Date;
  /** Body of the newest message — the card's preview. */
  lastBody: string | null;
};

/**
 * One page of a view. Cached per request because /tickets/[id] renders the
 * list pane too.
 */
export const listMailPage = cache(
  async (
    workspaceId: number,
    view: InboxView,
    page: number,
  ): Promise<TicketListRow[]> =>
    db
      .select({
        id: tickets.id,
        source: tickets.source,
        orderId: tickets.orderId,
        customerName: tickets.customerName,
        customerEmail: tickets.customerEmail,
        subject: tickets.subject,
        status: tickets.status,
        updatedAt: tickets.updatedAt,
        lastBody: sql<string | null>`(
          SELECT m.body FROM ticket_messages m
          WHERE m.ticket_id = ${outerTicketId}
          ORDER BY m.sent_at DESC, m.id DESC
          LIMIT 1
        )`,
      })
      .from(tickets)
      .where(viewWhere(workspaceId, view))
      .orderBy(desc(tickets.updatedAt))
      .limit(TICKETS_PAGE_SIZE)
      .offset((Math.max(1, page) - 1) * TICKETS_PAGE_SIZE),
);

/** Database row → list card. */
export function toMailRow(t: TicketListRow, now: Date = new Date()): MailRow {
  return {
    id: t.id,
    name: t.customerName,
    email: t.customerEmail,
    subject: t.subject,
    preview: t.lastBody ? previewText(t.lastBody, 90) : "",
    time: relativeTime(t.updatedAt, now),
    source: t.source,
    status: t.status,
    orderId: t.orderId,
  };
}

export type ContactFacts = {
  /** When this person first contacted the workspace. Null if never recorded. */
  firstSeenIso: string | null;
  /** How many tickets this email has opened in this workspace. */
  ticketCount: number;
};

/**
 * The two facts about a contact the rail can honestly show. Phone number,
 * lifecycle status and notes have no columns, so the rail says so instead of
 * inventing them.
 */
export async function getContactFacts(
  workspaceId: number,
  email: string,
): Promise<ContactFacts> {
  const address = email.trim().toLowerCase();
  const [row] = await db
    .select({
      firstSeen: contacts.firstSeen,
      ticketCount: sql<number>`(
        SELECT count(*)::int FROM tickets t
        WHERE t.workspace_id = ${workspaceId} AND t.customer_email = ${address}
      )`,
    })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, workspaceId), eq(contacts.email, address)))
    .limit(1);

  if (row) {
    return {
      firstSeenIso: row.firstSeen ? new Date(row.firstSeen).toISOString() : null,
      ticketCount: row.ticketCount,
    };
  }

  // A ticket can exist without a contacts row (contacts were added later).
  const [fallback] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tickets)
    .where(
      and(
        eq(tickets.workspaceId, workspaceId),
        eq(tickets.customerEmail, address),
      ),
    );
  return { firstSeenIso: null, ticketCount: fallback?.n ?? 0 };
}

export type ContactNoteDTO = {
  id: number;
  body: string;
  authorLabel: string;
  createdAtIso: string;
};

/**
 * Internal notes about a contact, newest first.
 *
 * Keyed by email, not contact id: a ticket can exist with no `contacts` row at
 * all, and those are the oldest customers — the ones there is most to say
 * about. See the note on the table in db/schema.ts.
 *
 * The workspace is a parameter and the caller must resolve it from the
 * session. This file is not a "use server" module, so this is not reachable as
 * a POST endpoint; it is imported by Server Components only.
 */
export async function listContactNotes(
  workspaceId: number,
  email: string,
): Promise<ContactNoteDTO[]> {
  const address = email.trim().toLowerCase();
  const rows = await db
    .select({
      id: contactNotes.id,
      body: contactNotes.body,
      authorLabel: contactNotes.authorLabel,
      createdAt: contactNotes.createdAt,
    })
    .from(contactNotes)
    .where(
      and(
        eq(contactNotes.workspaceId, workspaceId),
        eq(contactNotes.contactEmail, address),
      ),
    )
    .orderBy(desc(contactNotes.createdAt))
    // A contact with two hundred notes is a different feature (paging), and
    // this rail is 290px wide. Cap it rather than render a wall.
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    authorLabel: r.authorLabel,
    createdAtIso: new Date(r.createdAt).toISOString(),
  }));
}
