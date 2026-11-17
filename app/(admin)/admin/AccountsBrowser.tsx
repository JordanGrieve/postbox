"use client";

import { useMemo, useState } from "react";
import type { WorkspaceSummary } from "@/lib/data";
import type { ImpersonationSessionRow } from "@/lib/impersonation";
import type { ImpersonationReadRow } from "@/lib/impersonation-reads";
import type { WorkspaceUsage } from "./queries";
import { describePlan } from "./billing-rollup";
import { createClientAction } from "./actions";
import { AccountDetails, DeletePanel, RotateKeyPanel } from "./account-panels";
import Modal from "@/components/Modal";
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
        The shared modal (components/Modal.tsx): a bottom sheet on a phone,
        announced by the account's name. A link inside (Replace ingestion key,
        Delete workspace) navigates to a confirmation panel on the page
        behind, so the modal closes first or it would sit on top of the panel
        it just opened.
      */}
      <Modal
        open={open !== null}
        onClose={() => setOpenId(null)}
        title={open?.name ?? ""}
        closeLabel="Close account details"
        closeOnLinkClick
        className="pba-account-modal"
      >
        {open && (
          <AccountDetails
            account={open}
            teamSize={teamSizes[open.id] ?? 0}
            query={query}
            recentAccess={recentAccess[open.id] ?? []}
            reads={readsMap}
            usage={usage[open.id] ?? null}
          />
        )}
      </Modal>
    </>
  );
}
