import { redirect } from "next/navigation";
import { resolveViewer } from "@/lib/viewer";
import { EMAIL_FROM_ADDRESS } from "@/lib/config";
import {
  DEFAULT_WELCOME,
  getWelcomeEmail,
  welcomeConfigFrom,
} from "@/lib/welcome-store";
import WelcomeEmailForm from "./WelcomeEmailForm";
import "../../../settings.css";
import "../../../newsletter.css";

export const metadata = { title: "Welcome email" };

/**
 * /newsletters/welcome — the one email that sends itself.
 *
 * ── WHY IT IS HERE AND NOT IN SETTINGS ──
 * It was in Settings → General, under Newsletter branding. Jordan, 14 Sep
 * 2026, standing on the newsletter page: "I don't see the newsletter on
 * AMORIA's page." A client looking for the emails their newsletter sends
 * looks at Newsletter, and something nobody can find is something nobody
 * edits — while this one sends to real customers whether or not it has been
 * read.
 *
 * ── WHY IT IS NOT THE COMPOSER ──
 * It shares the composer's pieces — the same fields, the same validators, the
 * same renderer driving the preview — and deliberately not the composer
 * itself. That component is a campaign's whole lifecycle: drafts, an audience,
 * a schedule, a send. A welcome has none of those. It goes to one person at
 * the moment they subscribe.
 *
 * The form is a client island and is the whole screen (Jordan's mockup,
 * 19 Nov 2026); every value it needs to run the real renderer is read here
 * and passed down as plain data, including the from-address, so nothing
 * drags lib/config into the browser bundle.
 */
export default async function WelcomeNewsletterPage() {
  const viewer = await resolveViewer();
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");
  const workspace = viewer.workspace;

  const welcome = await getWelcomeEmail(workspace.id);

  return (
    <div className="pbm-page pb-scroll">
      <WelcomeEmailForm
        initial={welcome ? welcomeConfigFrom(welcome) : DEFAULT_WELCOME}
        hasPostalAddress={(workspace.postalAddress ?? "").trim().length > 0}
        workspaceName={workspace.name}
        legalName={workspace.legalName}
        postalAddress={workspace.postalAddress}
        brandAccentHex={workspace.brandAccentHex}
        brandSignOff={workspace.brandSignOff}
        viewerEmail={viewer.email}
        fromAddress={EMAIL_FROM_ADDRESS}
      />
    </div>
  );
}
