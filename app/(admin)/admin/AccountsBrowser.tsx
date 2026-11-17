"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkspaceSummary } from "@/lib/data";
import type { ImpersonationSessionRow } from "@/lib/impersonation";
import type { ImpersonationReadRow } from "@/lib/impersonation-reads";
import type { WorkspaceUsage } from "./queries";
import { describePlan } from "./billing-rollup";
import { createClientAction } from "./actions";
import { AccountDetails, DeletePanel, RotateKeyPanel } from "./account-panels";
import SheetGrip from "@/components/mail/SheetGrip";
import { useMediaQuery } from "@/lib/use-media-query";
import {
  decideSheetTouch,
  sheetOffset,
  shouldCloseOnRelease,
  type SheetTouch,
} from "@/lib/sheet-drag";

/**
 * The width at and below which the account modal is a bottom sheet. Mirrors
 * the media query in app/admin.css; the CSS decides the layout and this only
 * decides whether the drag gesture is wired.
 */
const SHEET_QUERY = "(max-width: 640px)";
import {
  accountStatus,
  formatDate,
  needsAttention,
  KpiGrid,
  StatusPill,
  type AdminQuery,
  type Filter,
} from "./ui";

/**
 * The accounts pane — table, details modal and all — driven from state in the
 * browser.
 *
 * ── DETAILS IN A MODAL, FROM 16 NOV 2026 ──
 *
 * An account's details sat in a 320px drawer down the right of the screen,
 * always open, always showing whichever row was selected. Jordan, 16 Nov:
 * "this side bar here should be a modal that we click on the table … we can
 * remove that side bar which gives us space". So the table now runs the full
 * width, each row ends in a Details button, and the details open in a native
 * <dialog>. showModal() gives focus containment, Escape to close, an inert
 * page behind it and focus returned to the button afterwards, all without a
 * library — the four things a hand-rolled modal most often gets wrong.
 *
 * The notes below about state rather than URLs still hold; "drawer" in them
 * now means the modal.
 *
 * ── WHY THIS IS A CLIENT COMPONENT ──
 *
 * Searching and picking a client used to be links. Every filter press and every
 * row you clicked wrote a new URL and sent the whole console back to the server
 * to answer it, for a table of four rows whose data was already on the page.
 *
 * Jordan's call, 14 Sep 2026: "the search should not change the url and update /
 * refresh the whole page, it should be all within the component… that's the
 * same for when I click on these accounts".
 *
 * So the search box, the filter tabs and the selected row are `useState`. No
 * navigation, no URL, no round trip, no scroll jump. The navigation column, the
 * page heading and the banners sit outside this component and are not
 * re-rendered at all.
 *
 * ── WHY IT OWNS THE DRAWER TOO ──
 *
 * The drawer is a sibling of <main> in the page shell, not a child of it, and
 * the selection has to drive both. React state cannot be shared between two
 * server-rendered siblings, and a render prop cannot cross the server/client
 * boundary — functions are not serializable. So this component renders the
 * whole `.pba-body` row for the accounts section: the main column and the
 * aside. Other sections still render the old way.
 *
 * ── WHAT THIS COSTS, AND WHY IT IS STILL RIGHT ──
 *
 * The drawer's data has to be on the page BEFORE anybody clicks, so the server
 * sends team size and recent access for every workspace rather than for one.
 * Both are single bulk reads (agentCountsByWorkspace, recentAccessByWorkspace)
 * and deliberately not a query per row — that is the N+1 which looks free at
 * four clients and is the slowest page in the product at four hundred. If this
 * table ever needs pagination, that is the moment to revisit this, and those
 * two reads are where to start.
 *
 * The URL is no longer a permalink to a selected client. A real loss, taken
 * deliberately: nobody was sharing links into this console, and the flicker was
 * on every single interaction.
 */

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "All accounts" },
  // Second, and named as an instruction rather than a state. This tab exists
  // because Open Door Bakery sat under "No enquiries yet" for six weeks with a
  // broken contact form and nothing ever asked anyone to look.
  { key: "attention", label: "Needs a look" },
  { key: "active", label: "Active" },
  { key: "invited", label: "Awaiting sign-in" },
  { key: "quiet", label: "No enquiries yet" },
];

/**
 * Case-insensitive match across the three things an operator actually types:
 * the business name, the inbound address, and the owner's email.
 *
 * Not the plan or the status — those are what the tabs are for, and a search
 * that also matched them would make typing "active" select rows the Active tab
 * does not. Nobody debugs that; they just stop trusting the box.
 */
function matches(w: WorkspaceSummary, needle: string): boolean {
  if (!needle) return true;
  return [w.name, w.inboundEmail, w.ownerEmail ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export default function AccountsBrowser({
  accounts,
  teamSizes,
  recentAccess,
  usage,
  reads,
  deleteTarget,
  rotateTarget,
  query,
  banners,
}: {
  accounts: WorkspaceSummary[];
  /** Team size per workspace id. Bulk-read; see the header. */
  teamSizes: Record<number, number>;
  /** The last few operator visits per workspace id. Bulk-read. */
  recentAccess: Record<number, ImpersonationSessionRow[]>;
  usage: Record<number, WorkspaceUsage>;
  /** Records opened during those visits, keyed by session id. */
  reads: Record<number, ImpersonationReadRow[]>;
  /** From ?delete=<id>, which stays in the URL: it is a confirmation step. */
  deleteTarget: WorkspaceSummary | null;
  /** From ?rotate=<id>. Same shape, same reason — a confirmation step. */
  rotateTarget: WorkspaceSummary | null;
  query: AdminQuery;
  /** Server-rendered, passed through as a node — not re-rendered on a click. */
  banners: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // The account whose details are open, or null for none. Looked up in the
  // full list rather than the filtered one: typing in the search box behind
  // an open modal is not possible, and if a refresh drops the row the modal
  // closes rather than describing something no longer there.
  const [openId, setOpenId] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const needle = q.trim().toLowerCase();

  const visible = useMemo(
    () =>
      accounts.filter(
        (w) =>
          matches(w, needle) &&
          (filter === "all" ||
            (filter === "attention"
              ? needsAttention(w)
              : accountStatus(w) === filter)),
      ),
    [accounts, needle, filter],
  );

  const countFor = (f: Filter) => {
    if (f === "all") return accounts.length;
    if (f === "attention") return accounts.filter((w) => needsAttention(w)).length;
    return accounts.filter((w) => accountStatus(w) === f).length;
  };

  const open = accounts.find((w) => w.id === openId) ?? null;

  /*
    Drive the native dialog from state. showModal() can only be called on a
    connected, closed dialog, hence the checks; close() fires the dialog's own
    "close" event, which is where state is cleared, so Escape, the close
    button and a click on the backdrop all end up in the same place.
  */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /*
    ── ON A PHONE, A BOTTOM SHEET YOU CAN DRAG AWAY ──
    Jordan, 17 Nov 2026: on mobile the modal should come up from the bottom
    and drag down to close, with the grab bar. It is the inbox's contact
    sheet gesture, reused rather than rewritten: SheetGrip for the handle and
    lib/sheet-drag.ts for every rule (follow the finger down, resist up,
    close past 110px, never close on a system cancel). The CSS makes it a
    sheet; this only wires the drag, and only at the width the CSS does.

    The body drags too, when its scroller is at the top and the finger moves
    down — the same conditional claim as ContactRail, which needs raw
    non-passive touch listeners because touch-action cannot express a
    condition.
  */
  const sheet = useMediaQuery(SHEET_QUERY);
  const [dragY, setDragY] = useState(0);
  const innerRef = useRef<HTMLDivElement>(null);
  const closeSheet = () => dialogRef.current?.close();

  useEffect(() => {
    const el = innerRef.current;
    if (!el || !open || !sheet) return;
    let startX = 0;
    let startY = 0;
    let mode: SheetTouch = "wait";
    let travelled = 0;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || !t) {
        mode = "scroll";
        return;
      }
      startX = t.clientX;
      startY = t.clientY;
      mode = "wait";
      travelled = 0;
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || mode === "scroll") return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (mode === "wait") mode = decideSheetTouch(el.scrollTop, dx, dy);
      if (mode !== "drag") return;
      if (e.cancelable) e.preventDefault();
      travelled = sheetOffset(dy);
      setDragY(travelled);
    };
    const onEnd = () => {
      const wasDrag = mode === "drag";
      const distance = travelled;
      mode = "wait";
      travelled = 0;
      if (!wasDrag) return;
      setDragY(0);
      if (shouldCloseOnRelease(distance)) dialogRef.current?.close();
    };
    // Taken away by the system: never a close, however far it had moved.
    const onCancel = () => {
      if (mode === "drag") setDragY(0);
      mode = "wait";
      travelled = 0;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onCancel);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [open, sheet]);

  // One clock for the whole table. Read per row, two workspaces either side of
  // a period boundary could be judged against different instants.
  const now = new Date();

  // Map, not Record, is what AccountDrawer takes. Rebuilt here because a Map
  // does not survive the trip from the server as a prop.
  const readsMap = useMemo(
    () =>
      new Map(
        Object.entries(reads).map(([k, v]) => [Number(k), v] as const),
      ),
    [reads],
  );

  return (
    <>
      <main className="pba-content">
        {banners}

        {deleteTarget && <DeletePanel target={deleteTarget} />}
        {rotateTarget && <RotateKeyPanel target={rotateTarget} />}

        <KpiGrid accounts={accounts} />

        <div className="pba-tabrow">
          <div className="pba-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`pba-tab${filter === t.key ? " is-active" : ""}`}
                aria-pressed={filter === t.key}
              >
                {t.label}
                <span>{countFor(t.key)}</span>
              </button>
            ))}
          </div>

          {/*
            The search sits with the tabs, at the far right, because it does the
            same job they do: it narrows THIS table and nothing else. It used to
            live in the page header beside a "New account" button, where it read
            as a search of the whole console.

            A <div>, not a <form>. There is nothing to submit — it filters as
            you type — and a form here would let Enter reload the page, which is
            precisely the behaviour being removed.
          */}
          <div className="pba-tabsearch">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search accounts…"
              aria-label="Search accounts"
            />
          </div>
        </div>

        <div className="pba-table">
          <div className="pba-scroll">
            <div className="pba-grid pba-grid-accounts">
              <div className="pba-thead">
                <div className="pba-row pba-row-accounts pba-th">
                  <div>Company</div>
                  <div>Owner</div>
                  <div>Plan</div>
                  <div>Enquiries</div>
                  <div>Open</div>
                  <div>Created</div>
                  <div>Status</div>
                  {/* Named for screen readers; the buttons below say it. */}
                  <div className="stg-sr-only">Details</div>
                </div>
              </div>
              <div className="pba-tbody">
                {visible.length === 0 && (
                  <div className="pba-row">
                    <div className="pba-td">
                      {accounts.length === 0
                        ? "No client workspaces yet — create the first one below."
                        : "No accounts match that search or filter."}
                    </div>
                  </div>
                )}
                {visible.map((w) => (
                  /*
                    A plain row with one button at the end, rather than the
                    whole row as a button. The row used to be the button when
                    clicking it only highlighted it; now a click opens a modal,
                    and a control that size with no visible label is a surprise.
                    The button names the account so a screen reader hears
                    "Details for Amoria", not six "Details" in a row.
                  */
                  <div key={w.id} className="pba-row pba-row-accounts">
                    <div>
                      <div className="pba-cell-main">{w.name}</div>
                      <div className="pba-cell-sub">{w.inboundEmail}</div>
                    </div>
                    <div className="pba-td">{w.ownerEmail ?? "—"}</div>
                    <div className="pba-td">{describePlan(w, now)}</div>
                    <div className="pba-num">{w.totalCount}</div>
                    <div className="pba-num">{w.openCount}</div>
                    <div className="pba-td">{formatDate(w.createdAt)}</div>
                    <div>
                      <StatusPill status={accountStatus(w)} />
                    </div>
                    <div>
                      <button
                        type="button"
                        className="pba-btn pba-btn-details"
                        onClick={() => setOpenId(w.id)}
                        aria-haspopup="dialog"
                        aria-label={`Details for ${w.name}`}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pba-card" id="new-account">
          <div className="pba-card-head">
            <h2 className="pba-card-title">New account</h2>
          </div>
          <form action={createClientAction} className="pba-form">
            {/*
              aria-label, because a placeholder is not a label: it disappears the
              moment anyone types, so the field it identified becomes an unnamed
              box for exactly the people who most need it named. WCAG 3.3.2.
            */}
            <input
              type="text"
              name="name"
              required
              aria-label="Business name"
              placeholder="Business name — e.g. Open Door Bakery"
              className="pba-input pba-input-grow"
            />
            <input
              type="email"
              name="email"
              required
              aria-label="Client login email"
              placeholder="Client login email"
              className="pba-input pba-input-grow"
            />
            <button type="submit" className="pba-btn pba-btn-primary">
              Create workspace
            </button>
          </form>
        </div>
      </main>

      {/*
        Rendered always, so the ref exists before the first click; empty until
        an account is open. aria-labelledby points at the heading inside, so
        the dialog is announced by the account's name.

        A click on the backdrop lands on the <dialog> element itself, never on
        its content, which is what the target check below relies on. A click
        on a link inside (Replace ingestion key, Delete workspace) navigates to
        a confirmation panel on the page behind, so the modal closes first or
        it would sit on top of the panel it just opened.

        The lint rules below ask for a keyboard twin of a click handler on a
        non-interactive element. This one has two built in: Escape closes a
        modal <dialog> natively, and the close button is the first control
        inside. The click handler only adds the mouse-only backdrop gesture.
      */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialogRef}
        className="pba-modal"
        aria-labelledby="pba-modal-title"
        data-dragging={dragY !== 0 || undefined}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        onClose={() => {
          setDragY(0);
          setOpenId(null);
        }}
        onClick={(e) => {
          const target = e.target as Element;
          if (target === e.currentTarget || target.closest("a")) {
            e.currentTarget.close();
          }
        }}
      >
        {/* The grab bar. Hidden by CSS above the sheet width, so on a desktop
            it is neither drawn nor focusable. */}
        {open && (
          <SheetGrip
            onClose={closeSheet}
            onOffset={setDragY}
            label="Drag down to close account details"
            className="pba-sheet-grip"
          />
        )}
        {open && (
          <div className="pba-modal-inner" ref={innerRef}>
            <div className="pba-modal-head">
              <h2 id="pba-modal-title" className="pba-modal-title">
                {open.name}
              </h2>
              <button
                type="button"
                className="pba-modal-close"
                onClick={() => dialogRef.current?.close()}
                aria-label="Close account details"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <AccountDetails
              account={open}
              teamSize={teamSizes[open.id] ?? 0}
              query={query}
              recentAccess={recentAccess[open.id] ?? []}
              reads={readsMap}
              usage={usage[open.id] ?? null}
            />
          </div>
        )}
      </dialog>
    </>
  );
}
