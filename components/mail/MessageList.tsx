"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useVisibleRefresh } from "@/lib/use-visible-refresh";
import { SOURCE_META } from "@/lib/theme";
import { Icon, SearchIcon } from "./icons";
import type { MailRow } from "./types";
import type { InboxView } from "./types";

/**
 * The list pane (full width below 768px).
 *
 * ── TWO TABS, NOT ELEVEN FOLDERS ──
 * Jordan, 18 Nov 2026, from a mockup: the dashboard was "too complicated".
 * The list is the inbox and nothing else: "To reply" (open conversations)
 * and "Done" (closed ones), as two tabs at the top. They replace the nav's
 * eleven folders on a desktop and the phone's horizontally scrolling folder
 * strip. Stars, labels, the unread dot, the Awaiting and order tags and
 * swipe-to-archive went with the features behind them.
 *
 * The tabs and pagination are resolved on the server; the search box
 * refines the page that is already loaded.
 */
export default function MessageList({
  rows,
  view,
  counts,
  page,
  pageCount,
  total,
  selectedId,
  hideOnMobile = false,
}: {
  rows: MailRow[];
  view: InboxView;
  /** The two tab counts: open (To reply) and closed (Done). */
  counts: { toReply: number; done: number };
  page: number;
  pageCount: number;
  /** Real COUNT(*) for this tab — not the length of the loaded page. */
  total: number;
  selectedId?: number;
  /** True on a thread route, where the phone shows the thread instead. */
  hideOnMobile?: boolean;
}) {
  const [search, setSearch] = useState("");

  // Keep the list live: new tickets used to appear only on manual reload.
  // Skipped while a thread is open — Thread runs its own 30s refresh for the
  // whole route, and two timers on one page is just double the server work.
  useVisibleRefresh(45_000, selectedId === undefined);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.preview.toLowerCase().includes(q) ||
        (r.orderId ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const refined = search.trim() !== "";
  const viewQuery = view === "closed" ? "folder=closed&" : "";

  const tabs: { key: InboxView; label: string; count: number; href: string }[] = [
    { key: "inbox", label: "To reply", count: counts.toReply, href: "/inbox" },
    { key: "closed", label: "Done", count: counts.done, href: "/inbox?folder=closed" },
  ];

  return (
    // `pb-scroll` because on a phone the LIST is the scroller (mail.css moves
    // the overflow up from .pbm-list-scroll so the search and tabs scroll
    // away with the cards), and pb-scroll is what the drawer's scroll-lock
    // targets. Harmless on desktop, where the section does not scroll.
    <section
      className="pbm-list pb-scroll"
      data-hide-mobile={hideOnMobile || undefined}
      aria-label="Message list"
    >
      <div className="pbm-list-head">
        <h1 className="pbm-list-title">Inbox</h1>

        {/* Links, not buttons: each tab is its own URL, so a refresh, the
            back button and a shared link all land on the same tab. */}
        <nav className="pbm-tabs" aria-label="Inbox">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className="pbm-tab"
              data-on={view === t.key || undefined}
              aria-current={view === t.key ? "page" : undefined}
            >
              {t.label}
              <span className="pbm-tab-count">{t.count}</span>
            </Link>
          ))}
        </nav>

        <div className="pbm-search">
          <span className="pbm-search-icon" aria-hidden>
            <SearchIcon size={16} />
          </span>
          <input
            className="pbm-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search messages"
            placeholder="Search messages…"
          />
        </div>

        {refined && (
          <p className="pbm-list-meta">
            {visible.length} of {rows.length} on this page
          </p>
        )}
      </div>

      <div className="pbm-list-scroll pb-scroll">
        {visible.length === 0 ? (
          <EmptyList
            view={view}
            search={search}
            refined={refined}
            hasAny={counts.toReply + counts.done > 0}
            onClear={() => setSearch("")}
          />
        ) : (
          visible.map((r) => (
            <MailCard
              key={r.id}
              row={r}
              selected={r.id === selectedId}
              href={`/tickets/${r.id}?${viewQuery}page=${page}`}
            />
          ))
        )}

        {pageCount > 1 && (
          <nav className="pbm-pager" aria-label="Message pages">
            {page > 1 ? (
              <Link href={`/inbox?${viewQuery}page=${page - 1}`}>← Newer</Link>
            ) : (
              <span className="pbm-pager-off">← Newer</span>
            )}
            <span className="pbm-pager-pos">
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link href={`/inbox?${viewQuery}page=${page + 1}`}>Older →</Link>
            ) : (
              <span className="pbm-pager-off">Older →</span>
            )}
          </nav>
        )}
        {/* Read by the pager's absence too: one page of `total` is the
            whole tab. */}
        <span className="pbm-sr">
          {total} {total === 1 ? "conversation" : "conversations"}
        </span>
      </div>
    </section>
  );
}

/**
 * One conversation: who, when, what they said last, and where it came from.
 * The mockup's row, and nothing else.
 */
function MailCard({
  row,
  selected,
  href,
}: {
  row: MailRow;
  selected: boolean;
  href: string;
}) {
  const src = SOURCE_META[row.source];
  return (
    <Link
      href={href}
      className="pbm-card"
      data-selected={selected || undefined}
      aria-current={selected ? "true" : undefined}
    >
      <div className="pbm-card-top">
        <span className="pbm-card-name">{row.name}</span>
        <span className="pbm-card-time">{row.time}</span>
      </div>
      <div className="pbm-card-preview">
        {row.preview || "No messages on this conversation yet."}
      </div>
      <div className="pbm-card-from">from {src.label.toLowerCase()}</div>
    </Link>
  );
}

function EmptyList({
  view,
  refined,
  hasAny,
  onClear,
  search,
}: {
  view: InboxView;
  refined: boolean;
  hasAny: boolean;
  onClear: () => void;
  /** What they typed in the box above, so "search everything" can carry it. */
  search: string;
}) {
  const title = refined
    ? "Nothing matches"
    : !hasAny
      ? "No messages yet"
      : view === "inbox"
        ? "All caught up"
        : "Nothing done yet";
  const body = refined
    ? "Nothing on this page matches your search."
    : !hasAny
      ? "When someone fills in your contact form or emails you, the conversation appears here."
      : view === "inbox"
        ? "Nobody is waiting on a reply."
        : "Conversations you mark as done move here.";
  return (
    <div className="pbm-empty">
      <span className="pbm-empty-mark" aria-hidden>
        <Icon name={view === "closed" && !refined ? "check" : "mail"} size={26} />
      </span>
      <h2 className="pbm-empty-title">{title}</h2>
      <p className="pbm-empty-body">{body}</p>
      {refined ? (
        <div className="pbm-empty-actions">
          <button className="pbm-btn" onClick={onClear}>
            Clear
          </button>
          {/* The box filters THIS PAGE only; /search reads every message in
              the workspace. Offered at the point the page runs out. */}
          {search.trim() && (
            <Link
              className="pbm-btn pbm-btn--quiet"
              href={`/search?q=${encodeURIComponent(search.trim())}`}
            >
              Search everything
            </Link>
          )}
        </div>
      ) : (
        !hasAny && (
          <Link className="pbm-btn" href="/settings/install">
            Connect your form
          </Link>
        )
      )}
    </div>
  );
}
