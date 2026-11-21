import { notFound, redirect } from "next/navigation";
import Thread from "@/components/mail/Thread";
import { parseId } from "@/lib/ids";
import { currentImpersonation, resolveViewer } from "@/lib/viewer";
import { recordImpersonationRead } from "@/lib/impersonation-reads";
import { getTicket, getMessages, TICKETS_PAGE_SIZE } from "@/lib/data";
import { toTicketDTO, toMessageDTO } from "@/lib/serialize";
import { EMAIL_FROM_ADDRESS } from "@/lib/config";
import {
  getContactFacts,
  listContactNotes,
  mailCounts,
  parseInboxView,
} from "../../../queries";
import {
  addContactNoteAction,
  deleteContactNoteAction,
} from "../note-actions";

/**
 * The `@thread` slot: the conversation, plus the "About" panel that <Thread>
 * mounts alongside it.
 *
 * This is the only half of /tickets/[id] that skeletons on navigation, which
 * is the whole point of the split — see ../layout.tsx.
 *
 * Unlike the list pane, this component IS async and awaits at the top. That is
 * deliberate: the segment already has something to show while it runs, namely
 * this slot's own loading.tsx, so suspending here costs nothing and keeps
 * `notFound()` ahead of any Suspense boundary inside the slot.
 *
 * It re-derives the tab and page from searchParams for `backHref`. The counts
 * come from `mailCounts`, wrapped in React `cache()`, so sharing them with the
 * list pane costs no extra query.
 *
 * Since 18 Nov 2026 (the simple inbox) it no longer reads labels, the
 * viewer's star and unread state, trash, archive or snooze state, or builds a
 * Gmail link: the conversation pane offers none of them.
 */
export default async function TicketThreadSlot({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ folder?: string; page?: string }>;
}) {
  // int4 digits only (lib/ids.ts): a huge id used to reach Postgres and 500.
  const ticketId = parseId((await params).id);
  if (ticketId === null) notFound();

  const { folder: folderParam, page: pageParam } = await searchParams;
  const view = parseInboxView(folderParam);
  const page = Math.max(1, Number(pageParam) || 1);

  const viewer = await resolveViewer();
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");
  const workspace = viewer.workspace;

  const ticket = await getTicket(workspace.id, ticketId);
  if (!ticket) notFound();

  /*
    If a Postbox operator is reading this, record WHICH record they opened.

    After the notFound() above, deliberately: a request for a ticket that does
    not exist in this workspace is not access to anything, and logging it would
    fill a client's access log with entries for records they never had.

    Only ever fires during an impersonation — currentImpersonation() is null
    for a client's own staff, and logging their reads of their own inbox is a
    separate question nobody has asked for. See db/schema.ts.

    Not awaited in a way that can break the page: recordImpersonationRead
    swallows its own errors, because a failure to log must not stop an operator
    seeing the ticket they are in the middle of helping somebody with.
  */
  const impersonation = await currentImpersonation();
  if (impersonation?.session) {
    await recordImpersonationRead(impersonation.session.id, ticket.id);
  }

  const [{ messages, hasMore }, counts, facts, notes] = await Promise.all([
    getMessages(ticket.id),
    mailCounts(workspace.id),
    getContactFacts(workspace.id, ticket.customerEmail),
    // In the Promise.all, not after it: neon-http gives every statement its own
    // HTTP request, so awaiting this separately would add a round trip to
    // opening any thread.
    listContactNotes(workspace.id, ticket.customerEmail),
  ]);

  const pageCount = Math.max(1, Math.ceil(counts[view] / TICKETS_PAGE_SIZE));
  const now = new Date();
  const viewQuery = view === "closed" ? "folder=closed&" : "";
  const backHref = `/inbox?${viewQuery}page=${Math.min(page, pageCount)}`;

  return (
    <Thread
      ticket={toTicketDTO(ticket, now)}
      messages={messages.map(toMessageDTO)}
      hasOlderMessages={hasMore}
      fromAddress={`${workspace.name} <${EMAIL_FROM_ADDRESS}>`}
      contact={{
        name: ticket.customerName,
        email: ticket.customerEmail,
        firstSeenIso: facts.firstSeenIso,
        ticketCount: facts.ticketCount,
      }}
      notes={notes}
      // Server actions handed down as props: Thread is a client component and
      // must not import the "use server" module itself.
      addNote={addContactNoteAction}
      deleteNote={deleteContactNoteAction}
      backHref={backHref}
    />
  );
}
