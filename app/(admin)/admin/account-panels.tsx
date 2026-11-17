import Link from "next/link";
import type { WorkspaceSummary } from "@/lib/data";
import type { ImpersonationSessionRow as ImpersonationSession } from "@/lib/impersonation";
import type { ImpersonationReadRow } from "@/lib/impersonation-reads";
import { sessionState, type SessionState } from "@/lib/impersonation-view";
import { trialEndsAt } from "@/lib/trial";
import { billingState, describePlan } from "./billing-rollup";
import type { WorkspaceUsage } from "./queries";
import {
  deleteClientAction,
  rotateKeyAction,
  setOptInAction,
  resendInviteAction,
  selectWorkspaceAction,
} from "./actions";
import {
  accountStatus,
  formatDate,
  formatDateTime,
  formatDuration,
  hrefFor,
  END_LABEL,
  StatusPill,
  type AdminQuery,
} from "./ui";

/**
 * The panels that hang off an account: its details (shown in a modal since
 * 16 Nov 2026, see AccountsBrowser.tsx), and the two type-the-name
 * confirmations (delete, and replace the ingestion key).
 *
 * ── WHY THEY ARE NOT IN sections.tsx ──
 *
 * Because AccountsBrowser is a Client Component and imports them, and
 * sections.tsx opens with `@/lib/ingestion-log` and `@/lib/feedback-log` —
 * both `server-only`. Importing one component out of that file pulls the whole
 * module into the browser bundle, and the build stops on `server-only` with an
 * import trace four levels deep.
 *
 * Typecheck cannot see any of that: every signature is identical either side
 * of the boundary. Only `next build` walks the import graph, which is exactly
 * why AGENTS.md says to run it after a change that moves code across the
 * server/client line — this one was caught by the build and nothing else.
 *
 * Everything imported here is pure or a Server Action. Server Actions are
 * fine in a client bundle: they are a reference, not the code.
 */

export function DeletePanel({ target }: { target: WorkspaceSummary }) {
  return (
    <div className="pba-danger-panel">
      <p className="pba-danger-title">Permanently delete {target.name}?</p>
      <p className="pba-danger-text">
        This erases the workspace and everything in it —{" "}
        <b>
          {target.totalCount} enquir{target.totalCount === 1 ? "y" : "ies"}
        </b>
        , all message history, and its contacts. It cannot be undone. To confirm,
        type the workspace name exactly: <b>{target.name}</b>
      </p>
      <form action={deleteClientAction} className="pba-form">
        <input type="hidden" name="workspaceId" value={target.id} />
        {/* The most consequential field in the console, and it was named only
            by a placeholder that vanishes as soon as you start typing the
            workspace name into it. */}
        <input
          type="text"
          name="confirmName"
          required
          autoComplete="off"
          aria-label={`Type the workspace name "${target.name}" to confirm deletion`}
          placeholder={`Type "${target.name}" to confirm`}
          className="pba-input pba-input-grow"
        />
        <button type="submit" className="pba-btn pba-btn-danger">
          Permanently delete
        </button>
        <Link href="/admin" className="pba-btn">
          Cancel
        </Link>
      </form>
    </div>
  );
}

/**
 * The confirmation for replacing a client's ingestion key.
 *
 * Type-the-name, like the delete, and for a reason that is easy to argue with:
 * nothing is deleted here, so it looks like the milder action. It is not. A
 * delete is loud and lands on a client who asked for it; this one is silent and
 * lands on a client who is not in the room. Their form keeps taking
 * submissions, we stop receiving them, and nobody finds out until a customer
 * complains that nobody replied.
 *
 * The consequence is stated in full rather than summarised. An operator doing
 * this at 2am needs to read what has to happen NEXT, not what just happened.
 */
export function RotateKeyPanel({ target }: { target: WorkspaceSummary }) {
  return (
    <div className="pba-danger-panel">
      <p className="pba-danger-title">Replace the ingestion key for {target.name}?</p>
      <p className="pba-danger-text">
        The current key stops working <b>immediately</b>. Every contact form and
        newsletter signup on their website is posting with it, so their site
        stops reaching Postbox — quietly, with no error a visitor can see —
        until someone re-installs the snippet from their Install page.{" "}
        <b>Arrange that first.</b> Only rotate if the key is being abused; it
        cannot read any of their data, so a key on its own is not a leak. To
        confirm, type the workspace name exactly: <b>{target.name}</b>
      </p>
      <form action={rotateKeyAction} className="pba-form">
        <input type="hidden" name="workspaceId" value={target.id} />
        <input
          type="text"
          name="confirmName"
          required
          autoComplete="off"
          aria-label={`Type the workspace name "${target.name}" to confirm replacing their ingestion key`}
          placeholder={`Type "${target.name}" to confirm`}
          className="pba-input pba-input-grow"
        />
        <button type="submit" className="pba-btn pba-btn-danger">
          Replace the key
        </button>
        <Link href="/admin" className="pba-btn">
          Cancel
        </Link>
      </form>
    </div>
  );
}

/**
 * How long the operator was in there.
 *
 * Only a closed session has a real duration. For everything else this reports
 * a floor — start to last-seen — and says it is a floor, because the operator
 * could have sat on an open page for an hour after the last request we saw.
 */
function duration(session: ImpersonationSession, state: SessionState): string {
  if (state === "ended" && session.endedAt) {
    return formatDuration(session.startedAt, session.endedAt);
  }
  return `${formatDuration(session.startedAt, session.lastSeenAt)}+`;
}

/**
 * One account's details: addresses, plan, counts, operator access, and the
 * actions that act on it. The body of the account modal; the heading, the
 * close button and the dialog itself belong to AccountsBrowser.
 */
export function AccountDetails({
  account,
  teamSize,
  query,
  recentAccess,
  reads,
  usage,
}: {
  account: WorkspaceSummary;
  /** Agents attached to this workspace — real, from listAgentEmails. */
  teamSize: number;
  query: AdminQuery;
  /** This workspace's slice of the access log, newest first. */
  recentAccess: ImpersonationSession[];
  /** Records opened during those visits, keyed by session id. */
  reads: Map<number, ImpersonationReadRow[]>;
  /** This workspace's confirmed subscribers and trial-window tickets. */
  usage: WorkspaceUsage | null;
}) {
  const status = accountStatus(account);
  const closed = account.totalCount - account.openCount;
  const now = new Date();
  const state = billingState(account, now);

  return (
    <>
      <form action={selectWorkspaceAction} className="pba-modal-open">
        <input type="hidden" name="workspaceId" value={account.id} />
        <button type="submit" className="pba-linkbtn">
          Open workspace →
        </button>
      </form>

      <div className="pba-card">
        <dl className="pba-dl">
          <div>
            <dt className="pba-dt">Inbound address</dt>
            <dd className="pba-dd pba-mono">{account.inboundEmail}</dd>
          </div>
          <div>
            <dt className="pba-dt">Sending address</dt>
            <dd className="pba-dd pba-mono">{account.sendingEmail}</dd>
          </div>
          <div>
            <dt className="pba-dt">Owner</dt>
            <dd className="pba-dd">{account.ownerEmail ?? "—"}</dd>
          </div>
          <div>
            <dt className="pba-dt">Plan</dt>
            <dd className="pba-dd">{describePlan(account, now)}</dd>
          </div>
          <div>
            <dt className="pba-dt">
              {state === "trial" ? "Trial ends" : "Paid through"}
            </dt>
            <dd className="pba-dd">
              {state === "trial" ? (
                formatDate(trialEndsAt(account.trialStartedAt))
              ) : account.currentPeriodEnd ? (
                formatDate(account.currentPeriodEnd)
              ) : (
                // A comped account has no period and never will. Saying so
                // beats an em-dash that reads as a failed lookup.
                <span className="pba-withheld">no period — not charged</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="pba-dt">Customer since</dt>
            <dd className="pba-dd">{formatDate(account.createdAt)}</dd>
          </div>
          <div>
            <dt className="pba-dt">Status</dt>
            <dd className="pba-dd">
              <StatusPill status={status} />
            </dd>
          </div>
        </dl>
      </div>

      <div className="pba-card">
        <div className="pba-card-head">
          <h2 className="pba-card-title">All time</h2>
        </div>
        <div className="pba-tiles">
          <div className="pba-tile">
            <div className="pba-tile-value">{account.totalCount}</div>
            <div className="pba-tile-label">Enquiries</div>
          </div>
          <div className="pba-tile">
            <div className="pba-tile-value">{account.openCount}</div>
            <div className="pba-tile-label">Open</div>
          </div>
          <div className="pba-tile">
            <div className="pba-tile-value">{closed}</div>
            <div className="pba-tile-label">Closed</div>
          </div>
          <div className="pba-tile">
            <div className="pba-tile-value">{teamSize}</div>
            <div className="pba-tile-label">Team members</div>
          </div>
          <div className="pba-tile">
            <div className="pba-tile-value">{usage?.subscribers ?? 0}</div>
            <div className="pba-tile-label">Subscribers</div>
          </div>
        </div>
      </div>

      <div className="pba-card">
        <div className="pba-card-head">
          <h2 className="pba-card-title">Operator access</h2>
        </div>
        {recentAccess.length === 0 ? (
          <p className="pba-log-entry">
            No recorded visit to this workspace. Anything before access logging
            shipped left no trace, so this is not proof that nobody ever went in.
          </p>
        ) : (
          <div>
            {recentAccess.map((s) => {
              const state = sessionState(s);
              const opened = reads.get(s.id)?.length ?? 0;
              return (
                <div key={s.id} className="pba-log-entry">
                  <div className="pba-log-who">{s.adminEmail}</div>
                  <div className="pba-log-when">
                    {formatDateTime(s.startedAt)} · {duration(s, state)} ·{" "}
                    {state === "ended"
                      ? s.endedReason
                        ? END_LABEL[s.endedReason]
                        : "ended"
                      : state === "active"
                        ? "in progress"
                        : "never closed"}
                  </div>
                  {s.reason && <div className="pba-log-when">{s.reason}</div>}
                  <div className="pba-log-when">
                    {opened === 0
                      ? "no records recorded as opened"
                      : `${opened} ${opened === 1 ? "record" : "records"} opened`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pba-modal-actions">
        {/* The reason is optional — making it mandatory only teaches people to
            type "support". It is recorded exactly as given, or as "none". */}
        {/*
          A visible label rather than a placeholder (Jordan, 17 Nov 2026: make
          it "more clear and bigger"). The placeholder carried the whole
          instruction and was cut off at "Why are you going in? (" in a 600px
          modal, then vanished the moment anyone typed.
        */}
        <form action={selectWorkspaceAction} className="pba-impersonate">
          <input type="hidden" name="workspaceId" value={account.id} />
          <label htmlFor={`pba-reason-${account.id}`} className="pba-field-label">
            Why are you going in?{" "}
            <span className="pba-field-hint">Optional, recorded in the access log</span>
          </label>
          <input
            id={`pba-reason-${account.id}`}
            type="text"
            name="reason"
            maxLength={500}
            autoComplete="off"
            placeholder="e.g. A form submission didn't arrive"
            className="pba-input pba-input-lg"
          />
          <button type="submit" className="pba-btn pba-btn-block">
            Impersonate
          </button>
        </form>
        {account.pending && (
          <form action={resendInviteAction}>
            <input type="hidden" name="workspaceId" value={account.id} />
            <button type="submit" className="pba-btn pba-btn-block">
              Resend invite
            </button>
          </form>
        )}
        {/*
          Newsletter opt-in, as a one-click switch. The button names the state
          it moves to. A line above it stating the current state was removed
          on 16-17 Nov 2026 as obvious from the button (Jordan's call).
        */}
        <form action={setOptInAction}>
          <input type="hidden" name="workspaceId" value={account.id} />
          <input
            type="hidden"
            name="required"
            value={account.requireSignupConfirmation ? "0" : "1"}
          />
          <button type="submit" className="pba-btn pba-btn-block">
            {account.requireSignupConfirmation
              ? "Switch to subscribe immediately"
              : "Require a confirmation link"}
          </button>
        </form>

        {/* Not styled as danger. It is genuinely less severe than the delete
            below it, and a column of red buttons is a column nobody reads. The
            panel it opens does the warning. */}
        <Link
          href={`${hrefFor(query, { account: account.id })}&rotate=${account.id}`}
          className="pba-btn pba-btn-block"
        >
          Replace ingestion key…
        </Link>
        <Link
          href={`${hrefFor(query, { account: account.id })}&delete=${account.id}`}
          className="pba-btn pba-btn-danger pba-btn-block"
        >
          Delete workspace…
        </Link>
      </div>
    </>
  );
}