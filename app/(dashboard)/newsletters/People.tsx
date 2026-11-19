import Link from "next/link";
import { initials, relativeTime } from "@/lib/ticket-format";
import {
  SUBSCRIBERS_PAGE_SIZE,
  SUBSCRIBER_STATUSES,
  type StatusCounts,
  type SubscriberRow,
} from "../subscribers/queries";
import { STATUS_LABEL } from "../subscribers/labels";
import type { SubscriberStatus } from "@/db/schema";
import "../../subscribers.css";

/**
 * The People tab on /newsletters: everyone who signed up, filterable by
 * status, a page at a time.
 *
 * It was its own page, /subscribers, with its own row in the navigation.
 * Jordan, 19 Nov 2026, from the mockup: "we are removing subscribers and
 * moving it into there". The list, the filters, the consent markers and the
 * paging are unchanged; every link now stays inside the Newsletter page
 * (?tab=people), and /subscribers redirects here.
 *
 * Addresses arrive only through the signup form (hosted page or embed),
 * with the consent record that proves they asked. Nobody is added by hand.
 */
export default function People({
  workspaceName,
  counts,
  rows,
  hasMore,
  status,
  page,
}: {
  workspaceName: string;
  /** Read once by the page, which also shows the total on the tab. */
  counts: StatusCounts;
  /** This page of people, read by the page with the counts: every query on
   *  the route stays in one place, and this renders synchronously. */
  rows: SubscriberRow[];
  hasMore: boolean;
  status: SubscriberStatus | null;
  page: number;
}) {
  const now = new Date();
  const shown = status === null ? counts.all : counts[status];
  const filterHref = (s: string | null) =>
    s === null ? "/newsletters?tab=people" : `/newsletters?tab=people&status=${s}`;
  const pageHref = (p: number) =>
    `/newsletters?tab=people&${status === null ? "" : `status=${status}&`}page=${p}`;

  return (
    <section className="nl-people" aria-label="People">
      {counts.all > 0 && (
        <nav className="psb-filters" aria-label="Filter by status">
          <Link
            href={filterHref(null)}
            className="psb-filter"
            data-active={status === null}
            aria-current={status === null ? "page" : undefined}
          >
            All
            <span className="psb-filter-count">{counts.all.toLocaleString()}</span>
          </Link>
          {SUBSCRIBER_STATUSES.map((s) => (
            <Link
              key={s}
              href={filterHref(s)}
              className="psb-filter"
              data-active={status === s}
              aria-current={status === s ? "page" : undefined}
            >
              {STATUS_LABEL[s]}
              <span className="psb-filter-count">{counts[s].toLocaleString()}</span>
            </Link>
          ))}
        </nav>
      )}

      {rows.length === 0 ? (
        <div className="psb-empty">
          {counts.all === 0 ? (
            <>
              <p className="psb-empty-title">Nobody has signed up yet</p>
              <p className="psb-empty-body">
                People appear here when they sign up to {workspaceName} through
                your signup form.
              </p>
            </>
          ) : (
            <>
              <p className="psb-empty-title">
                No {status ? STATUS_LABEL[status].toLowerCase() : ""} people
              </p>
              <p className="psb-empty-body">
                {page > 1
                  ? "That page is past the end of the list."
                  : "Nobody is in this state right now."}{" "}
                <Link href={filterHref(null)}>Show everyone</Link>.
              </p>
            </>
          )}
        </div>
      ) : (
        <ul className="psb-list">
          {rows.map((s) => {
            const consented = s.consentMethod !== null && s.consentAt !== null;
            return (
              <li key={s.id}>
                <Link href={`/subscribers/${s.id}`} className="psb-row">
                  <span className="psb-avatar" aria-hidden>
                    {initials(s.name ?? s.email)}
                  </span>
                  <span className="psb-person">
                    <span className="psb-name">{s.name ?? s.email}</span>
                    <span className="psb-email">
                      {s.name === null ? "No name on record" : s.email}
                    </span>
                  </span>
                  <span className="psb-meta">
                    <span
                      className="psb-consent"
                      data-ok={consented}
                      title={
                        consented
                          ? "Consent evidence is on record"
                          : "No consent evidence on record"
                      }
                    >
                      {consented ? "Consent ✓" : "No consent"}
                    </span>
                    <span className="psb-chip" data-status={s.status}>
                      {STATUS_LABEL[s.status]}
                    </span>
                    <span className="psb-source">{s.source ?? "source unknown"}</span>
                    <span className="psb-when" title="Subscribed">
                      {relativeTime(s.subscribedAt, now)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        // .pbm-pager comes from mail.css, imported by the dashboard layout.
        <nav className="pbm-pager" aria-label="People pages">
          {page > 1 ? (
            <Link href={pageHref(page - 1)}>← Newer</Link>
          ) : (
            <span className="pbm-pager-off">← Newer</span>
          )}
          <span className="pbm-pager-pos">
            {shown === 0
              ? `Page ${page}`
              : `${((page - 1) * SUBSCRIBERS_PAGE_SIZE + 1).toLocaleString()}–${(
                  (page - 1) * SUBSCRIBERS_PAGE_SIZE + rows.length
                ).toLocaleString()} of ${shown.toLocaleString()}`}
          </span>
          {hasMore ? (
            <Link href={pageHref(page + 1)}>Older →</Link>
          ) : (
            <span className="pbm-pager-off">Older →</span>
          )}
        </nav>
      )}
    </section>
  );
}
