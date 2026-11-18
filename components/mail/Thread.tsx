"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDismiss } from "@/lib/use-dismiss";
import { useVisibleRefresh } from "@/lib/use-visible-refresh";
import { useTipDismiss } from "@/lib/use-tip-dismiss";
import type { TicketDTO, MessageDTO } from "@/lib/serialize";
import { formatDateTime } from "@/lib/serialize";
import type { TicketStatus } from "@/db/schema";
import { SOURCE_META } from "@/lib/theme";
import { Icon, OverflowIcon } from "./icons";
import ContactRail from "./ContactRail";
import type { ContactNoteDTO } from "@/app/(dashboard)/queries";
import { describeDeliveryStatus } from "@/lib/delivery-events";
import type { ContactCard } from "./types";

/**
 * The conversation pane, plus the "About" panel it can open.
 *
 * ── ONE DECISION PER CONVERSATION ──
 * Jordan, 18 Nov 2026, from a mockup: the dashboard was "too complicated".
 * The header carried seven icon buttons (star, unread, Find in Gmail,
 * snooze, archive, trash, details) over a row of chips (message count, a
 * three-way status menu, the source, labels). It is now the one question a
 * conversation asks — is it done? — as "Mark as done" (or "Reopen"), and
 * "…" for the panel about the person. Done is status `closed`; reopening is
 * `open`. Their data and API routes are untouched; only the interface went.
 *
 * Everything that writes — replies and status changes — goes through the
 * existing authed API routes unchanged, so tenancy is still enforced
 * server-side.
 */
export default function Thread({
  ticket,
  messages,
  hasOlderMessages = false,
  fromAddress,
  contact,
  notes,
  addNote,
  deleteNote,
  backHref,
}: {
  ticket: TicketDTO;
  messages: MessageDTO[];
  hasOlderMessages?: boolean;
  fromAddress: string;
  contact: ContactCard;
  /** Internal notes about this contact, newest first. */
  notes: ContactNoteDTO[];
  /**
   * The note server actions, passed down rather than imported. This is a
   * client file: importing a "use server" module here would bundle a reference
   * to every export in it, and the rule in this codebase is that those modules
   * are reached from Server Components only.
   */
  addNote: (formData: FormData) => void;
  deleteNote: (formData: FormData) => void;
  backHref: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  /**
   * Three states, not two. The panel should start open as a column on a wide
   * screen and closed as an overlay on a narrow one — a single boolean cannot
   * express that without measuring the viewport, which the server cannot do and
   * which would cost a layout shift after hydration. "auto" lets a media query
   * in mail.css make that first decision; a click resolves it either way.
   */
  const [rail, setRail] = useState<"auto" | "open" | "closed">("auto");
  const [wide, setWide] = useState(false);
  const railOpen = rail === "auto" ? wide : rail === "open";
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Mirrors the mail.css breakpoint. Only used to keep aria-expanded truthful
  // while the panel is still in its "auto" state — layout is CSS's job.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1181px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Below 1180px the panel is an overlay over the thread, so Esc must close it.
  useDismiss(railOpen, () => setRail("closed"));

  // Escape hides the header's tooltips (WCAG 1.4.13).
  useTipDismiss();

  // Customer replies should appear without a manual reload.
  useVisibleRefresh(30_000);

  // Land on the newest message, like every other messaging client.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const src = SOURCE_META[ticket.source];
  const done = status === "closed";
  const canSend = replyText.trim().length > 0 && !sending;

  /** Mark as done (closed), or reopen (open). */
  async function toggleDone() {
    if (busy) return;
    const next: TicketStatus = done ? "open" : "closed";
    const prev = status;
    setBusy(true);
    setStatus(next);
    const res = await fetch(`/api/tickets/${ticket.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setStatus(prev);
      setError(done ? "Couldn't reopen this." : "Couldn't mark this as done.");
      return;
    }
    // The list's tabs and counts move with it.
    router.refresh();
  }

  async function sendReply() {
    const message = replyText.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/tickets/${ticket.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setSending(false);
    if (!res.ok) {
      setError("Couldn't send your reply. Please try again.");
      return;
    }
    const data = (await res.json()) as { emailSent?: boolean };
    setReplyText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    if (status !== "closed") setStatus("in_progress");
    if (data.emailSent === false) {
      setError("Saved to the thread, but email delivery isn't configured yet.");
    }
    router.refresh();
  }

  return (
    <>
      <section className="pbm-thread" aria-label="Conversation">
        <header className="pbm-thread-head">
          <Link href={backHref} className="pbm-icon-btn pbm-back" aria-label="Back to the list">
            <Icon name="back" size={17} strokeWidth={2.2} />
          </Link>
          <div className="pbm-thread-who">
            <p className="pbm-thread-name">{ticket.customerName}</p>
            <p className="pbm-thread-email">{ticket.customerEmail}</p>
          </div>
          <div className="pbm-thread-actions">
            <button
              type="button"
              className="pbm-done-btn"
              onClick={() => void toggleDone()}
              disabled={busy}
              aria-pressed={done}
            >
              <Icon name={done ? "mail" : "check"} size={15} strokeWidth={2.2} />
              {done ? "Reopen" : "Mark as done"}
            </button>
            <button
              className="pbm-icon-btn"
              onClick={() => setRail(railOpen ? "closed" : "open")}
              aria-expanded={railOpen}
              aria-label={railOpen ? "Hide details" : "Show details"}
              data-tip="Details"
              data-tip-align="end"
            >
              <OverflowIcon size={17} />
            </button>
          </div>
        </header>

        <div className="pbm-thread-subject">
          <h1 className="pbm-subject">{ticket.subject}</h1>
        </div>

        <div className="pbm-transcript pb-scroll">
          {hasOlderMessages && (
            <p className="pbm-transcript-note">
              Showing the latest {messages.length} messages — older history is
              retained but not displayed.
            </p>
          )}
          {ticket.source === "order" && ticket.orderId && (
            <p className="pbm-transcript-note">
              Linked order <b>{ticket.orderId}</b>
            </p>
          )}
          {messages.length === 0 && (
            <p className="pbm-transcript-note">
              This conversation has no messages yet.
            </p>
          )}
          {messages.map((m) => {
            const out = m.direction === "outbound";
            return (
              <div key={m.id} className="pbm-bubble-row" data-out={out || undefined}>
                <div className="pbm-bubble-wrap">
                  <div className="pbm-bubble">{m.body}</div>
                  {/* The design's "Delivered" is now a claim we can back: the
                      Resend webhook advances delivery_status. It is still only
                      ever what the provider told us, so this falls back to
                      "Sent" when nothing has come back yet rather than
                      assuming the better outcome. */}
                  <p
                    className="pbm-bubble-foot"
                    data-delivery={out ? (m.deliveryStatus ?? undefined) : undefined}
                    suppressHydrationWarning
                  >
                    {formatDateTime(m.sentAtIso)}
                    {out
                      ? ` · ${describeDeliveryStatus(m.deliveryStatus) ?? "Sent"}`
                      : ` · via ${src.label.toLowerCase()}`}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="pbm-composer-wrap">
          <div className="pbm-composer">
            <textarea
              ref={inputRef}
              className="pbm-composer-input"
              rows={1}
              value={replyText}
              aria-label="Write a reply"
              placeholder="Write your reply…"
              onChange={(e) => {
                setReplyText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 132)}px`;
              }}
              onKeyDown={(e) => {
                /*
                  ENTER WRITES A NEWLINE. This is an EMAIL composer, not a chat
                  box: what leaves here is a real email to a customer, and
                  people press Enter in emails (a greeting line, a paragraph
                  break, a sign-off). Ctrl/Cmd+Enter sends, the convention
                  every mail client uses.
                */
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void sendReply();
                }
              }}
            />
            <button
              className="pbm-send"
              onClick={() => void sendReply()}
              disabled={!canSend}
            >
              <span>{sending ? "Sending…" : "Send"}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden focusable="false">
                <path d="M3.5 11.8L20 4.5l-7.3 16.5-2.2-6.6-7-2.6z" fill="currentColor" />
              </svg>
            </button>
          </div>
          <p className="pbm-composer-foot" role={error ? "alert" : undefined}>
            {error ? (
              <span className="pbm-error">{error}</span>
            ) : (
              <>
                Sends a real email from <b>{fromAddress}</b>. Enter starts a new
                line; Ctrl+Enter (⌘+Enter on a Mac) sends.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Always rendered; mail.css decides whether "auto" means shown. */}
      <ContactRail
        contact={contact}
        state={rail}
        onClose={() => setRail("closed")}
        notes={notes}
        addNote={addNote}
        deleteNote={deleteNote}
      />
    </>
  );
}
