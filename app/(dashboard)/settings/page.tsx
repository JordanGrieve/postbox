import { redirect } from "next/navigation";
import { resolveViewer } from "@/lib/viewer";
import BusinessDetails from "./BusinessDetails";

export const metadata = { title: "Your business · Settings" };

/**
 * /settings — Your business. The first Settings section, and where the
 * account menu's "Settings" lands.
 *
 * Built to the 20 Nov 2026 design ("Settings idea 3 — read, then Change"):
 * one list of what the workspace is called and how it appears, each line with
 * its own Change. See BusinessDetails.tsx for why it is a list and not forms.
 *
 * ── WHERE THE REST OF THE OLD "GENERAL" PAGE WENT ──
 * General also carried an Inbox summary and an Integrations panel. Each now
 * lives in the section it summarised, rather than being repeated here:
 *   - auto-reply on/off       → Auto-reply
 *   - who gets notified       → Notifications
 *   - inbound address, reply-from, forms, the website form → Email & forms
 *     (Install already shows the first two; Forms is its own page)
 *   - the welcome newsletter pointer → Newsletters, where the editor lives
 * The "Not built" Slack card and sending-domain row were dropped, not moved:
 * a section about what you can set should not list what you cannot.
 *
 * A server component; BusinessDetails is the client island and receives plain
 * values only, so nothing here drags lib/config into the browser.
 */
export default async function YourBusinessPage() {
  const viewer = await resolveViewer();
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");
  const w = viewer.workspace;

  return (
    <div className="stg-wrap">
      <header className="stg-head">
        <p className="stg-eyebrow">Settings</p>
        <h1 className="stg-title">Your business</h1>
        <p className="stg-sub">
          How you appear in replies and newsletters. Change anything you
          like — it saves as you go.
        </p>
      </header>

      <BusinessDetails
        name={w.name}
        legalName={w.legalName}
        postalAddress={w.postalAddress}
        brandAccentHex={w.brandAccentHex}
        brandSignOff={w.brandSignOff}
        theme={w.accent}
      />
    </div>
  );
}
