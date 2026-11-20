import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveViewer } from "@/lib/viewer";
import { listAgentEmails } from "@/lib/data";

export const metadata = { title: "Notifications · Settings" };

/**
 * /settings/notifications — who gets an email when a customer writes in.
 *
 * A section in the 20 Nov 2026 design. There are no notification SETTINGS to
 * show yet: lib/notify.ts emails everyone on the team about every new enquiry
 * and every reply, with no per-person choice. So this page says exactly that,
 * as a read-then-Change row whose Change goes to the team — which is the one
 * thing that does change who is notified. No switches that would do nothing.
 *
 * The recipient list is listAgentEmails, the same read lib/notify.ts sends to,
 * so the page cannot disagree with what actually happens.
 */
export default async function NotificationsPage() {
  const viewer = await resolveViewer();
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");
  const emails = await listAgentEmails(viewer.workspace.id);

  return (
    <div className="stg-wrap">
      <header className="stg-head">
        <p className="stg-eyebrow">Settings</p>
        <h1 className="stg-title">Notifications</h1>
        <p className="stg-sub">
          Who gets an email when a customer writes in or replies.
        </p>
      </header>

      <dl className="stg-biz">
        <div className="stg-biz-row">
          <dt className="stg-biz-label">Emailed about every new enquiry and reply</dt>
          <dd className="stg-biz-body">
            {emails.length === 0 ? (
              <span className="stg-biz-value stg-biz-value--empty">
                No one on this workspace yet
              </span>
            ) : (
              <ul className="stg-biz-list">
                {emails.map((e) => (
                  <li className="stg-biz-value" key={e}>
                    {e}
                  </li>
                ))}
              </ul>
            )}
            <span className="stg-biz-note stg-biz-note--quiet">
              Everyone on your team gets these.
            </span>
          </dd>
          <dd className="stg-biz-side">
            <Link
              href="/settings/team"
              className="stg-biz-action"
              aria-label="Change who gets notified, on the Team page"
            >
              Change
            </Link>
          </dd>
        </div>
      </dl>
    </div>
  );
}
