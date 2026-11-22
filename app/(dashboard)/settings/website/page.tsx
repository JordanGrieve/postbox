import { redirect } from "next/navigation";
import { resolveViewer } from "@/lib/viewer";
import { EMAIL_FROM_ADDRESS } from "@/lib/config";
import { timeAgo } from "@/lib/ticket-format";
import CopyButton from "@/components/CopyButton";
import { InfoRow, RowGroup, RowLink, SettingsHeader } from "../rows";
import { lastArrivals } from "./queries";

export const metadata = { title: "Website & email · Settings" };

/**
 * /settings/website — Website & email: how messages reach the workspace and
 * where its replies come from. Built to the 20 Nov 2026 design.
 *
 * A summary of facts, each with the one thing you would do about it. The
 * long-form instructions (snippets, prompts for site builders) stay on
 * /settings/install, which "Setup steps" links to; named forms are on
 * /settings/forms, which "Manage" links to. Both link back here
 * (SettingsBackLink).
 *
 * Every sentence here is checked against the code it describes:
 *   - "Connected" means a contact-form message has actually arrived
 *     (lastArrivals), not that a key exists.
 *   - Forwarded mail mentioning "#1001" or "ORD-123" is filed as an order
 *     (detectOrderId in lib/tickets.ts).
 *   - Replies thread back into the conversation via per-ticket reply
 *     addresses.
 *   - The download is GET /api/workspace/export: conversations, messages and
 *     contacts (exportWorkspaceData in lib/data.ts) — not subscribers, so the
 *     row does not claim them.
 */
export default async function WebsiteEmailPage() {
  const viewer = await resolveViewer();
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");
  const w = viewer.workspace;
  const last = await lastArrivals(w.id);

  return (
    <div className="stg-wrap">
      <SettingsHeader
        title="Website & email"
        sub="How messages get to you, and where your replies come from."
      />

      <RowGroup title="Getting messages in">
        <InfoRow
          label="Contact form"
          value={last.contactForm ? "Connected" : "Not connected yet"}
          empty={!last.contactForm}
          note={
            last.contactForm
              ? `Last message ${timeAgo(last.contactForm)}.`
              : "Add the form to your website to get its messages here."
          }
          action={
            <RowLink href="/settings/install" label="Setup steps for your contact form">
              Setup steps
            </RowLink>
          }
        />
        <InfoRow
          label="Newsletter sign-up"
          value={last.signup ? "Connected" : "Ready to add"}
          note={
            last.signup
              ? `Last sign-up ${timeAgo(last.signup)}.`
              : "Collects newsletter subscribers from your website."
          }
          action={
            <RowLink href="/settings/install" label="Set up your newsletter sign-up">
              Set up
            </RowLink>
          }
        />
        <InfoRow
          label="Forms"
          value="A separate form for each page"
          action={
            <RowLink href="/settings/forms" label="Manage your forms">
              Manage
            </RowLink>
          }
        />
        <InfoRow
          label="Forward your email here"
          value={w.inboundEmail}
          mono
          note="Optional. Order numbers like #1001 are marked as orders."
          action={
            <CopyButton
              value={w.inboundEmail}
              className="stg-biz-action"
              ariaLabel="Copy your forwarding address"
            />
          }
        />
      </RowGroup>

      <RowGroup title="Sending">
        <InfoRow
          label="Your replies come from"
          value={`${w.name} <${EMAIL_FROM_ADDRESS}>`}
        />
      </RowGroup>

      <RowGroup title="Your data">
        <InfoRow
          label="Download everything"
          value="Every message, conversation and contact, as one file"
          note="Contains customer details, so keep it safe."
          action={
            // A plain anchor: this is a file from an API route, not a page.
            <a
              href="/api/workspace/export"
              className="stg-biz-action"
              aria-label="Download everything, as one file"
              download
            >
              Download
            </a>
          }
        />
      </RowGroup>
    </div>
  );
}
