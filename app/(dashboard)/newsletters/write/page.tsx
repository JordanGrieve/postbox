import { redirect } from "next/navigation";
import { resolveViewer } from "@/lib/viewer";
import { listCampaigns } from "@/lib/campaign-send";
import { APP_URL } from "@/lib/config";
import { RECIPIENTS_PER_SWEEP } from "@/lib/campaign-cron";
import { DEFAULT_WELCOME, getWelcomeEmail } from "@/lib/welcome-store";
import Composer, { type CampaignRowDTO } from "../Composer";
import "../../../newsletter.css";

export const metadata = { title: "Write a newsletter" };

/**
 * /newsletters/write — the campaign composer, on a page of its own.
 *
 * It WAS /newsletters, with the campaign list down its left side. Since
 * 19 Nov 2026 (Jordan's mockup) /newsletters is the overview — the list,
 * the numbers and the People tab — and this is where "Write a newsletter",
 * "Keep writing" and "View" go. `?id=` opens that campaign; no id starts a
 * blank one. The composer's own rail is off here: the overview is the list.
 *
 * A server component whose only job is to hand the client island what it
 * must not read for itself:
 *
 *  - `appUrl`, which comes from lib/config. That module carries `server-only`
 *    and reads non-NEXT_PUBLIC_ env vars; importing it from a client component
 *    (directly or transitively) took production down once already. It is
 *    passed as a plain string, exactly as lib/newsletter.ts's header requires.
 *  - the workspace name and identity, which the branded preview renders.
 *  - the viewer's email, for the "send me a test" control.
 *  - `RECIPIENTS_PER_SWEEP`, from lib/campaign-cron.ts. That module imports
 *    node:crypto for the cron authorisation check, so the client island
 *    cannot import it; passing the number keeps the composer's "how long will
 *    this take" figures derived from the real batch size.
 */
export default async function WriteNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const viewer = await resolveViewer();
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");
  const workspace = viewer.workspace;

  const { id: idParam } = await searchParams;
  const idNum = Number(idParam);
  const openId = Number.isInteger(idNum) && idNum > 0 ? idNum : null;

  const [campaigns, welcome] = await Promise.all([
    listCampaigns(workspace.id),
    getWelcomeEmail(workspace.id),
  ]);
  const welcomeSends = welcome ? welcome.enabled : DEFAULT_WELCOME.enabled;

  // Dates cross the server/client boundary as ISO strings and are formatted
  // in the browser: formatting on the server renders UTC for everybody.
  const rows: CampaignRowDTO[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    status: c.status,
    listId: c.listId,
    listName: c.listName,
    recipientCount: c.recipientCount,
    updatedAtIso: c.updatedAt.toISOString(),
    sentAtIso: c.sentAt ? c.sentAt.toISOString() : null,
  }));

  // `.pbm-page pb-scroll` is the shell's "one document-shaped pane" wrapper:
  // the dashboard shell is height-constrained with overflow hidden, so a
  // route that does not opt into this scroll container simply clips.
  return (
    <div className="pbm-page pb-scroll">
      <Composer
        initialCampaigns={rows}
        initialOpenId={openId}
        showRail={false}
        workspaceName={workspace.name}
        legalName={workspace.legalName}
        postalAddress={workspace.postalAddress}
        brandAccentHex={workspace.brandAccentHex}
        brandSignOff={workspace.brandSignOff}
        appUrl={APP_URL}
        viewerEmail={viewer.email}
        recipientsPerSweep={RECIPIENTS_PER_SWEEP}
        welcomeEnabled={welcomeSends}
      />
    </div>
  );
}
