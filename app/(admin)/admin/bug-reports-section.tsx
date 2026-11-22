import type { BugReport } from "@/db/schema";
import { formatDateTime } from "@/lib/utc-time";
import { markBugReportFixedAction, reopenBugReportAction } from "./actions";

/**
 * The Bug reports pane: what people sent with "Report a bug" in the account
 * menu (22 Nov 2026). Open ones newest first, each with Mark fixed; the last
 * few fixed underneath, with Reopen, so a mis-click can be undone.
 *
 * The message is rendered as text — it is typed by a client, and this is the
 * screen with every client's data one click away.
 */
export function BugReportsSection({
  open,
  fixed,
  workspaceNames,
}: {
  open: BugReport[];
  fixed: BugReport[];
  /** Workspace id → name, so a report says whose it is. */
  workspaceNames: Map<number, string>;
}) {
  const whose = (r: BugReport) =>
    r.workspaceId === null ? "no workspace" : (workspaceNames.get(r.workspaceId) ?? `workspace #${r.workspaceId}`);

  return (
    <>
      {open.length === 0 ? (
        <div className="pba-card">
          <div className="pba-card-head">
            <h2 className="pba-card-title">No open bug reports</h2>
            <p className="pba-card-sub">
              When somebody uses Report a bug in their account menu, it appears here.
            </p>
          </div>
        </div>
      ) : (
        open.map((r) => (
          <section key={r.id} className="pba-card" aria-labelledby={`bug-${r.id}-title`}>
            <div className="pba-card-head">
              <h2 className="pba-card-title" id={`bug-${r.id}-title`}>
                {whose(r)}
              </h2>
              <p className="pba-card-sub">
                {r.reporterEmail} · {formatDateTime(r.createdAt)}
                {r.page && <> · on {r.page}</>}
              </p>
            </div>
            <p className="pba-request-message pba-bug-message">{r.message}</p>
            {r.userAgent && <p className="pba-card-sub pba-bug-agent">{r.userAgent}</p>}
            <form action={markBugReportFixedAction} className="pba-request-decline">
              <input type="hidden" name="reportId" value={r.id} />
              <button
                type="submit"
                className="pba-btn pba-btn-primary"
                aria-label={`Mark the report from ${r.reporterEmail} fixed`}
              >
                Mark fixed
              </button>
            </form>
          </section>
        ))
      )}

      {fixed.length > 0 && (
        <section className="pba-card" aria-labelledby="bugs-fixed-title">
          <div className="pba-card-head">
            <h2 className="pba-card-title" id="bugs-fixed-title">
              Recently fixed
            </h2>
          </div>
          <ul className="pba-bug-fixed">
            {fixed.map((r) => (
              <li key={r.id} className="pba-bug-fixed-row">
                <span className="pba-bug-fixed-text">
                  <b>{whose(r)}</b> · {r.message.length > 90 ? `${r.message.slice(0, 90)}…` : r.message}
                </span>
                <form action={reopenBugReportAction}>
                  <input type="hidden" name="reportId" value={r.id} />
                  <button
                    type="submit"
                    className="pba-btn"
                    aria-label={`Reopen the report from ${r.reporterEmail}`}
                  >
                    Reopen
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
