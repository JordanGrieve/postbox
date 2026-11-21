import type { AccessRequest } from "@/db/schema";
import { MAX_BUSINESS_NAME } from "@/lib/access-requests";
import { formatDateTime } from "@/lib/utc-time";
import { approveAccessRequestAction, declineAccessRequestAction } from "./actions";

/**
 * The Requests pane: people who signed in with no workspace and pressed
 * "Send request" on /no-access (21 Nov 2026). Oldest first.
 *
 * Approve creates their workspace on their own login and emails them; the
 * business name is editable first, because it becomes the workspace's name
 * and a requester's typing is not always what the account should be called.
 * Decline keeps the request, marked declined, and sends nothing.
 *
 * The requester's note is rendered as text. They are a stranger, and this is
 * the screen with every client's data one click away.
 */
export function RequestsSection({ requests }: { requests: AccessRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="pba-card">
        <div className="pba-card-head">
          <h2 className="pba-card-title">No requests waiting</h2>
          <p className="pba-card-sub">
            When somebody signs in without a workspace and asks for access,
            their request appears here.
          </p>
        </div>
      </div>
    );
  }

  // No wrapper: each card owns its bottom margin (admin.css, .pba-card).
  return (
    <>
      {requests.map((r) => (
        <section
          key={r.id}
          className="pba-card"
          aria-labelledby={`request-${r.id}-title`}
        >
          <div className="pba-card-head">
            <h2 className="pba-card-title" id={`request-${r.id}-title`}>
              {r.businessName}
            </h2>
            <p className="pba-card-sub">
              {r.email} · asked {formatDateTime(r.createdAt)}
            </p>
          </div>

          {r.message && <p className="pba-request-message">{r.message}</p>}

          <form action={approveAccessRequestAction} className="pba-form">
            <input type="hidden" name="requestId" value={r.id} />
            <input
              type="text"
              name="name"
              required
              maxLength={MAX_BUSINESS_NAME}
              defaultValue={r.businessName}
              aria-label={`Workspace name for ${r.email}`}
              className="pba-input pba-input-grow"
            />
            <button type="submit" className="pba-btn pba-btn-primary">
              Approve
            </button>
          </form>
          <form action={declineAccessRequestAction} className="pba-request-decline">
            <input type="hidden" name="requestId" value={r.id} />
            <button
              type="submit"
              className="pba-btn pba-btn-danger"
              aria-label={`Decline the request from ${r.email}`}
            >
              Decline
            </button>
          </form>
        </section>
      ))}
    </>
  );
}
