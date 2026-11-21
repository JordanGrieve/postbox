import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import AuthProvider from "@/components/AuthProvider";
import "./no-access.css";

/**
 * Reached only by somebody already signed in who has no workspace, so there is
 * nothing here for a search engine. robots.txt already disallows the path, but
 * that stops a crawl rather than an index — a URL linked from elsewhere can
 * still be indexed without ever being fetched, and the meta tag is what
 * actually prevents it.
 *
 * Declaring it also stops this page inheriting the root layout's canonical and
 * announcing itself as a duplicate of the homepage. See app/pricing/page.tsx.
 */
export const metadata: Metadata = {
  title: "No access",
  robots: { index: false, follow: false },
};
// A third sign-out, easy to miss. Nobody reaches /no-access mid-impersonation
// (an operator has an admin row and lands on /admin), so this one closes no
// audit session in practice — it is routed through the same component anyway
// so that "sign out" means one thing everywhere, and so the next person to
// copy this page copies the right button. It still clears any stale
// pb_admin_ws left in the browser.
import AuditedSignOutButton from "@/components/AuditedSignOutButton";
import { resolveViewer } from "@/lib/viewer";
import { PostboxLockup } from "@/components/Logo";
import {
  latestAccessRequestFor,
  MAX_BUSINESS_NAME,
  MAX_REQUEST_MESSAGE,
} from "@/lib/access-requests";
import { formatDate } from "@/lib/utc-time";
import { requestAccessAction } from "./actions";

/**
 * Shown to signed-in users with no workspace and no invite (invite-only
 * mode). If they DO have access (invite claimed meanwhile, or an admin),
 * bounce them to the right place instead.
 *
 * From 21 Nov 2026 it is also where they ask for access: a short form whose
 * "Send request" lands in the operator console's Requests pane. Approving
 * there creates their workspace on their own login, so the next time this
 * page loads it sends them to /inbox.
 */
export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const viewer = await resolveViewer();
  if (viewer.isAdmin) redirect("/admin");
  if (viewer.workspace) redirect("/inbox");

  const { userId } = await auth();
  const request = userId ? await latestAccessRequestFor(userId) : null;
  const { error } = await searchParams;

  return (
    <AuthProvider>
      <div className="pbx-page">
        <div className="pbx-card">
          <div className="pbx-lockup">
            <PostboxLockup />
          </div>

          {request?.status === "pending" ? (
            <>
              <h1 className="pbx-title">Request sent</h1>
              <p className="pbx-text" role="status">
                We&rsquo;ve got your request for <b>{request.businessName}</b>,
                sent {formatDate(request.createdAt)}. We&rsquo;ll email{" "}
                <b>{request.email}</b> when your inbox is ready.
              </p>
            </>
          ) : request?.status === "declined" ? (
            <>
              <h1 className="pbx-title">Request not approved</h1>
              <p className="pbx-text">
                Your request for <b>{request.businessName}</b> wasn&rsquo;t
                approved. If you think that&rsquo;s a mistake, get in touch
                through <a href="/contact">our contact page</a>.
              </p>
            </>
          ) : (
            <>
              <h1 className="pbx-title">Postbox is invite-only</h1>
              <p className="pbx-text">
                You&rsquo;re signed in as <b>{viewer.email || "an unverified address"}</b>,
                but there&rsquo;s no workspace linked to that email. If you were
                invited, sign in with the email the invitation went to. Or ask
                us for access below.
              </p>

              {error && (
                <p className="pbx-error" role="alert">
                  {error}
                </p>
              )}

              <form action={requestAccessAction} className="pbx-form">
                <label className="pbx-field">
                  <span className="pbx-label">Business name</span>
                  <input
                    type="text"
                    name="businessName"
                    required
                    maxLength={MAX_BUSINESS_NAME}
                    autoComplete="organization"
                    className="pbx-input"
                  />
                </label>
                <label className="pbx-field">
                  <span className="pbx-label">
                    Anything we should know? <span className="pbx-optional">(optional)</span>
                  </span>
                  <textarea
                    name="message"
                    rows={3}
                    maxLength={MAX_REQUEST_MESSAGE}
                    className="pbx-input pbx-textarea"
                  />
                </label>
                <button type="submit" className="stg-button stg-button--wide">
                  Send request
                </button>
              </form>
            </>
          )}

          <div className="pbx-signout">
            <AuditedSignOutButton className="stg-button stg-button--secondary">
              Sign out
            </AuditedSignOutButton>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}
