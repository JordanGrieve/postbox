import { and, asc, desc, eq, notLike, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  workspaces,
  tickets,
  ticketMessages,
  contacts,
  agents,
  type Workspace,
  type Ticket,
  type TicketMessage,
  type Agent,
  type TicketSource,
  type TicketStatus,
  type DeliveryStatus,
  type MessageDirection,
} from "@/db/schema";
import { generateReplyToken } from "./tokens";

// ── Workspace lookups ────────────────────────────────────────────

export async function getWorkspaceByApiKey(apiKey: string) {
  const rows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.apiKey, apiKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateWorkspace(
  workspaceId: number,
  patch: Partial<
    Pick<
      typeof workspaces.$inferInsert,
      | "name"
      | "sendingEmail"
      | "accent"
      | "legalName"
      | "postalAddress"
      | "brandAccentHex"
      | "brandSignOff"
    >
  >,
) {
  const [updated] = await db
    .update(workspaces)
    .set(patch)
    .where(eq(workspaces.id, workspaceId))
    .returning();
  return updated ?? null;
}

export async function getWorkspaceByInboundEmail(email: string) {
  const rows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.inboundEmail, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Mint a fresh API key for a workspace. The old key stops working
 * immediately — that's the point (rotation after a leak).
 */
export async function rotateWorkspaceApiKey(
  workspaceId: number,
  newKey: string,
): Promise<Workspace | null> {
  const [updated] = await db
    .update(workspaces)
    .set({ apiKey: newKey })
    .where(eq(workspaces.id, workspaceId))
    .returning();
  return updated ?? null;
}

/**
 * Choose how this workspace's newsletter signups are confirmed.
 *
 * `true` puts them back on a confirmation link; `false` (the platform default)
 * is single opt-in. Operator-only — see the column's note in db/schema.ts for
 * why this is not a client-facing setting.
 *
 * Nothing already captured changes. Each subscriber's `consent_source` records
 * the mode that was in force when THEY signed up, which is the only honest way
 * to store it: a flag read at query time would retroactively restate how every
 * existing address consented.
 */
export async function setSignupConfirmation(
  workspaceId: number,
  required: boolean,
): Promise<Workspace | null> {
  const [updated] = await db
    .update(workspaces)
    .set({ requireSignupConfirmation: required })
    .where(eq(workspaces.id, workspaceId))
    .returning();
  return updated ?? null;
}

export async function getWorkspaceById(id: number): Promise<Workspace | null> {
  const rows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ── Agent lookups ────────────────────────────────────────────────


/**
 * The agent for a Clerk id, together with the workspace it belongs to, in ONE
 * round trip.
 *
 * ── WHY THIS EXISTS WHEN THE TWO SEPARATE LOOKUPS ALREADY DID ──
 * resolveViewer runs on every dashboard render, and the layout awaits it
 * before a single byte of HTML is produced. It was fetching the agent and then
 * its workspace as two sequential queries, and over neon-http every query is
 * its own HTTP request.
 *
 * Measured against the development database: a bare `SELECT 1` costs 33ms and
 * each of these lookups costs 38-44ms. That is roughly five milliseconds of
 * work sitting on top of a thirty-three millisecond round trip — so the cost
 * of the pair is almost entirely the fact that there are two of them, and
 * joining removes a whole hop rather than shaving a query.
 *
 * (Those absolute numbers are from a laptop, not from Vercel, so production
 * will be lower. The ratio is what transfers: the hop dominates the work
 * wherever it runs, which is why the fix is fewer queries and not faster ones.)
 *
 * LEFT JOIN, and the honest reason is not the one it looks like. An orphaned
 * agent cannot exist: agents.workspace_id is NOT NULL with ON DELETE CASCADE,
 * so deleting a workspace takes its agents with it and the null-workspace
 * branch is unreachable today. The caller checked for it before this change
 * too, equally unreachably.
 *
 * It stays LEFT because that preserves the previous behaviour EXACTLY, and
 * because an INNER join would quietly couple this lookup to that constraint —
 * if the cascade were ever relaxed, an inner join would turn a real agent into
 * "no agent at all" and send them to sign-up, which is a bad way to discover a
 * schema change. LEFT costs nothing and cannot become that bug.
 */
export async function getAgentWithWorkspaceByClerkId(
  clerkUserId: string,
): Promise<{ agent: Agent; workspace: Workspace | null } | null> {
  const rows = await db
    .select({ agent: agents, workspace: workspaces })
    .from(agents)
    .leftJoin(workspaces, eq(workspaces.id, agents.workspaceId))
    .where(eq(agents.clerkUserId, clerkUserId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return { agent: row.agent, workspace: row.workspace ?? null };
}

/** A real (non-seed) agent for this email, if any — used to pre-link admins. */
export async function getRealAgentByEmail(email: string): Promise<Agent | null> {
  const rows = await db
    .select()
    .from(agents)
    .where(
      and(
        sql`lower(${agents.email}) = ${email.trim().toLowerCase()}`,
        notLike(agents.clerkUserId, "SEED_%"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export type WorkspaceSummary = Workspace & {
  openCount: number;
  totalCount: number;
  /** Email of the workspace's first agent (the owner / invited client). */
  ownerEmail: string | null;
  /** True while the owner hasn't signed in yet (SEED_/INVITE_ placeholder). */
  pending: boolean;
  /**
   * Oldest and newest enquiry, or null when none have ever arrived. Feeds
   * lib/workspace-health.ts, which judges a workspace's silence against its
   * own historical rate rather than a fixed threshold — see its header for why
   * a fixed threshold is worse than useless here.
   */
  firstTicketAt: Date | null;
  lastTicketAt: Date | null;
};

/**
 * Every workspace with its open/total ticket counts and owner/invite status —
 * the admin overview. "Open" means any status that isn't "closed".
 */
export async function listWorkspaceSummaries(): Promise<WorkspaceSummary[]> {
  const [all, counts, allAgents] = await Promise.all([
    db.select().from(workspaces).orderBy(asc(workspaces.name)),
    db
      .select({
        workspaceId: tickets.workspaceId,
        status: tickets.status,
        count: sql<number>`count(*)::int`,
        // Per (workspace, status) because that is the existing grouping;
        // reduced to a per-workspace min/max below. One grouped scan rather
        // than a second round trip.
        oldest: sql<string | null>`min(${tickets.createdAt})`,
        newest: sql<string | null>`max(${tickets.createdAt})`,
      })
      .from(tickets)
      .groupBy(tickets.workspaceId, tickets.status),
    db
      .select({
        workspaceId: agents.workspaceId,
        email: agents.email,
        clerkUserId: agents.clerkUserId,
      })
      .from(agents)
      .orderBy(asc(agents.id)),
  ]);

  type Agg = {
    open: number;
    total: number;
    first: Date | null;
    last: Date | null;
  };
  const byWorkspace = new Map<number, Agg>();
  for (const row of counts) {
    const agg: Agg = byWorkspace.get(row.workspaceId) ?? {
      open: 0,
      total: 0,
      first: null,
      last: null,
    };
    agg.total += row.count;
    if (row.status !== "closed") agg.open += row.count;

    // Fold the per-status extremes into per-workspace ones.
    const oldest = row.oldest ? new Date(row.oldest) : null;
    const newest = row.newest ? new Date(row.newest) : null;
    if (oldest && (!agg.first || oldest < agg.first)) agg.first = oldest;
    if (newest && (!agg.last || newest > agg.last)) agg.last = newest;

    byWorkspace.set(row.workspaceId, agg);
  }

  // First agent per workspace = the owner (or the invited client).
  const ownerByWorkspace = new Map<number, { email: string; pending: boolean }>();
  for (const a of allAgents) {
    if (!ownerByWorkspace.has(a.workspaceId)) {
      ownerByWorkspace.set(a.workspaceId, {
        email: a.email,
        pending:
          a.clerkUserId.startsWith("SEED_") || a.clerkUserId.startsWith("INVITE_"),
      });
    }
  }

  return all.map((w) => ({
    ...w,
    openCount: byWorkspace.get(w.id)?.open ?? 0,
    totalCount: byWorkspace.get(w.id)?.total ?? 0,
    ownerEmail: ownerByWorkspace.get(w.id)?.email ?? null,
    pending: ownerByWorkspace.get(w.id)?.pending ?? false,
    firstTicketAt: byWorkspace.get(w.id)?.first ?? null,
    lastTicketAt: byWorkspace.get(w.id)?.last ?? null,
  }));
}

/**
 * The one conversation that holds any of these Message-IDs, for a reply that
 * arrived without its per-ticket address (sent to our From, replies@, by a
 * client that ignored Reply-To). Null when none does, or when they span more
 * than one ticket: a reply is threaded on evidence, never guessed.
 *
 * Message-IDs are known only to the people in the conversation — the
 * customer's own, and ours as the customer's client saw them — which is what
 * makes this safe across workspaces where a guessable ticket id is not.
 */
export async function findTicketByReferencedMessageIds(
  messageIds: string[],
): Promise<Ticket | null> {
  if (messageIds.length === 0) return null;
  const rows = await db
    .selectDistinct({ ticketId: ticketMessages.ticketId, workspaceId: tickets.workspaceId })
    .from(ticketMessages)
    .innerJoin(tickets, eq(ticketMessages.ticketId, tickets.id))
    .where(sql`${ticketMessages.messageId} IN (${sql.join(messageIds.map((id) => sql`${id}`), sql`, `)})`)
    .limit(2);
  if (rows.length !== 1) return null;
  return getTicket(rows[0].workspaceId, rows[0].ticketId);
}

/**
 * Has this email already been ingested INTO THIS WORKSPACE? Webhook
 * deliveries are retried on timeouts even after we processed them — matching
 * on Message-ID makes ingestion idempotent.
 *
 * Scoped to one workspace since 21 Nov 2026. It used to match across the
 * whole platform, so one email CC'd to two clients' Postbox addresses was
 * filed for whichever came first and dropped as a "duplicate" for the other.
 * A Message-ID names one email, not one tenant's copy of it.
 *
 * ticket_messages has no workspace_id: the join up to tickets is the scope,
 * as everywhere else.
 */
export async function messageIdExists(
  messageId: string,
  workspaceId: number,
): Promise<boolean> {
  const rows = await db
    .select({ id: ticketMessages.id })
    .from(ticketMessages)
    .innerJoin(tickets, eq(ticketMessages.ticketId, tickets.id))
    .where(and(eq(tickets.workspaceId, workspaceId), eq(ticketMessages.messageId, messageId)))
    .limit(1);
  return rows.length > 0;
}

/**
 * Backfill the real Message-ID of our most recent outbound message that
 * doesn't have one yet. The provider assigns Message-IDs we never see at send time —
 * but the customer's reply carries it in In-Reply-To, so we learn it here and
 * future replies can reference a complete chain.
 */
export async function backfillOutboundMessageId(
  ticketId: number,
  messageId: string,
): Promise<void> {
  const rows = await db
    .select({ id: ticketMessages.id })
    .from(ticketMessages)
    .where(
      and(
        eq(ticketMessages.ticketId, ticketId),
        eq(ticketMessages.direction, "outbound"),
        sql`${ticketMessages.messageId} IS NULL`,
      ),
    )
    .orderBy(desc(ticketMessages.sentAt))
    .limit(1);
  if (rows.length > 0) {
    await db
      .update(ticketMessages)
      .set({ messageId })
      .where(eq(ticketMessages.id, rows[0].id));
  }
}

/**
 * Permanently delete a workspace. Cascades wipe its tickets, messages,
 * contacts and agents (FKs are ON DELETE CASCADE). Admin-only callers must
 * double-confirm first. Returns the deleted row, or null if id didn't exist.
 */
export async function deleteWorkspace(id: number): Promise<Workspace | null> {
  const [deleted] = await db
    .delete(workspaces)
    .where(eq(workspaces.id, id))
    .returning();
  return deleted ?? null;
}

/** The workspace's pending (not-yet-signed-in) agent, if any. */
export async function getPendingAgent(workspaceId: number): Promise<Agent | null> {
  const rows = await db
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.workspaceId, workspaceId),
        sql`${agents.clerkUserId} LIKE 'INVITE\\_%' OR ${agents.clerkUserId} LIKE 'SEED\\_%'`,
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Distinct emails of a workspace's agents (owner + any invited teammates). */
export async function listAgentEmails(workspaceId: number): Promise<string[]> {
  const rows = await db
    .select({ email: agents.email })
    .from(agents)
    .where(
      and(
        eq(agents.workspaceId, workspaceId),
        // ── Pending invites are EXCLUDED ──
        // These notifications carry customer content: names, subjects, message
        // bodies. A placeholder row means somebody was invited and has never
        // signed in, so the address is unverified — nobody has proved they can
        // read that mailbox. Mailing a client's customer correspondence to an
        // address that might be a typo is a worse outcome than a notification
        // nobody receives, and the invite email itself already tells the
        // invitee there is an account waiting.
        //
        // This became load-bearing when clients gained a self-serve invite
        // screen (app/(dashboard)/settings/team). Before that, every
        // placeholder was created by an operator; now any client can type an
        // address into a box and, without this predicate, immediately start
        // forwarding their customers' messages to it.
        sql`${agents.clerkUserId} NOT LIKE 'INVITE\\_%' AND ${agents.clerkUserId} NOT LIKE 'SEED\\_%'`,
      ),
    );
  return [...new Set(rows.map((r) => r.email.toLowerCase()))];
}

/** Any agent row (real or pending invite) with this email, case-insensitive. */
export async function getAgentByEmail(email: string): Promise<Agent | null> {
  const rows = await db
    .select()
    .from(agents)
    .where(sql`lower(${agents.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return rows[0] ?? null;
}

// ── Contacts ─────────────────────────────────────────────────────

/** Insert a contact the first time we see (workspace, email). */
export async function upsertContact(
  workspaceId: number,
  name: string,
  email: string,
) {
  await db
    .insert(contacts)
    .values({ workspaceId, name, email: email.toLowerCase() })
    .onConflictDoNothing();
}


// ── Ticket reads (always scoped to a workspace) ──────────────────

export const TICKETS_PAGE_SIZE = 50;

/** A single ticket — returns null if it isn't in this workspace. */
export async function getTicket(
  workspaceId: number,
  ticketId: number,
): Promise<Ticket | null> {
  const rows = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.workspaceId, workspaceId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The latest `limit` messages of a ticket in chronological order, plus
 * whether older ones were cut off (very long threads stay renderable).
 */
export async function getMessages(
  ticketId: number,
  limit = 200,
): Promise<{ messages: TicketMessage[]; hasMore: boolean }> {
  const rows = await db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, ticketId))
    .orderBy(desc(ticketMessages.sentAt), desc(ticketMessages.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  return { messages: rows.slice(0, limit).reverse(), hasMore };
}

// ── GDPR data export ─────────────────────────────────────────────

export type WorkspaceExport = {
  exportedAt: string;
  workspace: {
    name: string;
    inboundEmail: string;
    createdAt: Date | null;
  };
  tickets: {
    id: number;
    source: TicketSource;
    orderId: string | null;
    customerName: string;
    customerEmail: string;
    subject: string;
    status: TicketStatus;
    createdAt: Date | null;
    updatedAt: Date | null;
  }[];
  messages: {
    id: number;
    ticketId: number;
    direction: MessageDirection;
    body: string;
    sentAt: Date | null;
  }[];
  contacts: {
    name: string;
    email: string;
    firstSeen: Date | null;
  }[];
};

/**
 * Everything a workspace holds about its customers, for the data-portability
 * right the privacy policy promises.
 *
 * Deliberately omits credentials and internal security material — the API key
 * and per-ticket reply tokens are not the customer's personal data, and an
 * export is a file that gets emailed around. Columns are listed explicitly
 * rather than `select()`ing whole rows, so a future column can't leak into
 * exports just by existing.
 */
export async function exportWorkspaceData(
  workspaceId: number,
): Promise<WorkspaceExport | null> {
  const workspace = await getWorkspaceById(workspaceId);
  if (!workspace) return null;

  const [ticketRows, messageRows, contactRows] = await Promise.all([
    db
      .select({
        id: tickets.id,
        source: tickets.source,
        orderId: tickets.orderId,
        customerName: tickets.customerName,
        customerEmail: tickets.customerEmail,
        subject: tickets.subject,
        status: tickets.status,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .where(eq(tickets.workspaceId, workspaceId))
      .orderBy(asc(tickets.id)),

    // Messages have no workspace column of their own — they inherit tenancy
    // through their ticket, so the join IS the tenant filter here.
    db
      .select({
        id: ticketMessages.id,
        ticketId: ticketMessages.ticketId,
        direction: ticketMessages.direction,
        body: ticketMessages.body,
        sentAt: ticketMessages.sentAt,
      })
      .from(ticketMessages)
      .innerJoin(tickets, eq(ticketMessages.ticketId, tickets.id))
      .where(eq(tickets.workspaceId, workspaceId))
      .orderBy(asc(ticketMessages.ticketId), asc(ticketMessages.sentAt)),

    db
      .select({
        name: contacts.name,
        email: contacts.email,
        firstSeen: contacts.firstSeen,
      })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId))
      .orderBy(asc(contacts.id)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    workspace: {
      name: workspace.name,
      inboundEmail: workspace.inboundEmail,
      createdAt: workspace.createdAt,
    },
    tickets: ticketRows,
    messages: messageRows,
    contacts: contactRows,
  };
}

// ── Ticket writes ────────────────────────────────────────────────

export async function createTicket(input: {
  workspaceId: number;
  source: TicketSource;
  orderId?: string | null;
  customerName: string;
  customerEmail: string;
  subject: string;
  body: string;
  direction?: MessageDirection;
  /** Email Message-ID of the originating email, when the source is email. */
  messageId?: string | null;
  /**
   * Which named form this came through, when a per-form key was used.
   *
   * Null for email and order tickets, and for contact-form tickets taken on
   * the workspace-wide key — which is every installation that predates named
   * forms. See lib/forms.ts.
   */
  formId?: number | null;
}): Promise<Ticket> {
  const [ticket] = await db
    .insert(tickets)
    .values({
      workspaceId: input.workspaceId,
      formId: input.formId ?? null,
      source: input.source,
      replyToken: generateReplyToken(),
      orderId: input.orderId ?? null,
      customerName: input.customerName,
      customerEmail: input.customerEmail.toLowerCase(),
      subject: input.subject,
      status: "open",
    })
    .returning();

  await db.insert(ticketMessages).values({
    ticketId: ticket.id,
    direction: input.direction ?? "inbound",
    body: input.body,
    messageId: input.messageId ?? null,
  });

  return ticket;
}

/** Append a message and bump the ticket's last-activity time. */
export async function addMessage(input: {
  ticketId: number;
  direction: MessageDirection;
  body: string;
  /** Optional new status to set atomically (e.g. reopen on inbound reply). */
  status?: TicketStatus;
  /** Email Message-ID (ours for outbound, the sender's for inbound). */
  messageId?: string | null;
  /**
   * True only when WE generated the message rather than a human — currently
   * just the auto-acknowledgement. Defaults to false, so every caller that
   * doesn't say otherwise records a human send, which is what the auto-reply
   * guard reads as "a teammate already answered".
   */
  automated?: boolean;
  /**
   * The PROVIDER's id for this send — Resend's, not the RFC 5322 Message-ID.
   *
   * It is the only thing a delivery webhook can be matched on. Discarding it,
   * which is what happened until 23 August 2026, makes every transactional
   * bounce unattributable: the event names an id the database has never heard
   * of, and a reply to a dead address fails with nobody told.
   */
  providerMessageId?: string | null;
  /**
   * Outbound only. Null on inbound means "not applicable", never "unknown".
   *
   * Set to 'sent' when the provider accepted it and 'failed' when it did not —
   * both are known at the call site and neither can be recovered later.
   */
  deliveryStatus?: DeliveryStatus | null;
}): Promise<TicketMessage> {
  const [message] = await db
    .insert(ticketMessages)
    .values({
      ticketId: input.ticketId,
      direction: input.direction,
      body: input.body,
      messageId: input.messageId ?? null,
      automated: input.automated ?? false,
      providerMessageId: input.providerMessageId ?? null,
      deliveryStatus: input.deliveryStatus ?? null,
    })
    .returning();

  await db
    .update(tickets)
    .set({
      // DB clock, not app clock — mixing the two skews inbox ordering.
      updatedAt: sql`now()`,
      ...(input.status ? { status: input.status } : {}),
    })
    .where(eq(tickets.id, input.ticketId));

  return message;
}

/** Update status — scoped to the workspace so cross-tenant writes fail. */
export async function setTicketStatus(
  workspaceId: number,
  ticketId: number,
  status: TicketStatus,
): Promise<Ticket | null> {
  const [updated] = await db
    .update(tickets)
    .set({ status, updatedAt: sql`now()` })
    .where(and(eq(tickets.id, ticketId), eq(tickets.workspaceId, workspaceId)))
    .returning();
  return updated ?? null;
}
