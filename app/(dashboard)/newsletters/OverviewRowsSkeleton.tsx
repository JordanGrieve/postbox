"use client";

import { useSearchParams } from "next/navigation";
import "../../subscribers.css";

/**
 * The part of the /newsletters skeleton below the tabs, which depends on the
 * tab: newsletter rows by default, the People filters and person rows on
 * ?tab=people (and on /subscribers, which redirects there).
 *
 * A server loading.tsx is not given the query string, so this one piece reads
 * it on the client. loading.tsx wraps it in Suspense with the newsletter rows
 * as the fallback, which is also what a build-time render without a query
 * string gets. Real .nl-ov-* and .psb-* classes, as everywhere else.
 */
export function CampaignRows() {
  return (
    <ul className="nl-ov-list" aria-hidden>
      {[180, 220, 150, 200].map((w, i) => (
        <li className="nl-ov-row" key={i}>
          <div className="nl-ov-row-text">
            <div className="nl-ov-row-name pbk-text" style={{ width: w, maxWidth: "100%" }}>
              &nbsp;
            </div>
            <div className="nl-ov-row-meta pbk-text" style={{ width: w - 40 }}>
              &nbsp;
            </div>
          </div>
          <div className="pbk-fill nl-ov-act" style={{ width: 96, height: 44, borderRadius: 10 }} />
        </li>
      ))}
    </ul>
  );
}

function PeopleRows() {
  return (
    <section className="nl-people" aria-hidden>
      {/* All, then one filter per subscriber status. */}
      <div className="psb-filters">
        {[64, 108, 120, 92, 112].map((w, i) => (
          <span className="psb-filter pbk-fill" style={{ width: w }} key={i}>
            &nbsp;
          </span>
        ))}
      </div>
      <ul className="psb-list">
        {[172, 204, 158, 188, 140].map((w, i) => (
          <li key={i}>
            <div className="psb-row">
              <span className="psb-avatar pbk-fill" />
              <span className="psb-person">
                <span className="psb-name pbk-text" style={{ width: w, maxWidth: "100%" }}>
                  &nbsp;
                </span>
                <span className="psb-email pbk-text" style={{ width: w + 40, maxWidth: "100%" }}>
                  &nbsp;
                </span>
              </span>
              <span className="psb-meta">
                <span className="psb-chip pbk-fill" style={{ width: 80 }}>
                  &nbsp;
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function OverviewRowsSkeleton() {
  const tab = useSearchParams().get("tab");
  return tab === "people" ? <PeopleRows /> : <CampaignRows />;
}
