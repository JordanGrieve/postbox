import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveViewer } from "@/lib/viewer";
import { listCampaigns } from "@/lib/campaign-send";
import { DEFAULT_WELCOME, getWelcomeEmail } from "@/lib/welcome-store";
import { listSubscriberPage, parseStatus, statusCounts } from "../subscribers/queries";
import People from "./People";
import { STATUS_LABELS } from "./composer-model";
import "../../newsletter.css";

export const metadata = { title: "Newsletter" };

/**
 * /newsletters — the overview, from Jordan's mockup (19 Nov 2026).
 *
 * What a client comes here to see, in the order they look for it: what this
 * is for, how many people signed up, when the last one went out, then either
 * the newsletters (the default tab) or the people (?tab=people). Writing one
 * is a button at the top that opens /newsletters/write; "Keep writing" and
 * "View" open a campaign there.
 *
 * The People tab is the subscriber list that was /subscribers and its own
 * row in the navigation ("we are removing subscribers and moving it into
 * there"); /subscribers redirects here.
 *
 * Server-rendered, both tabs: they are links, so each has its own URL and
 * survives a refresh and the back button.
 */
export default async function NewslettersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; page?: string }>;
}) {
  const viewer = await resolveViewer();
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");
  const workspace = viewer.workspace;

  const { tab, status: statusParam, page: pageParam } = await searchParams;
  const onPeople = tab === "people";
  const status = parseStatus(statusParam);
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);

  const [campaigns, welcome, counts, people] = await Promise.all([
    listCampaigns(workspace.id),
    getWelcomeEmail(workspace.id),
    statusCounts(workspace.id),
    // Only on the People tab: the Newsletters tab does not show anyone.
    onPeople ? listSubscriberPage(workspace.id, status, page) : null,
  ]);
  const welcomeSends = welcome ? welcome.enabled : DEFAULT_WELCOME.enabled;

  // The newest SENT campaign, for the "Last newsletter" tile.
  const lastSent = campaigns
    .filter((c) => c.sentAt !== null)
    .reduce<Date | null>(
      (latest, c) => (latest === null || c.sentAt! > latest ? c.sentAt! : latest),
      null,
    );

  return (
    <div className="pbm-page pb-scroll">
      <div className="nl-overview">
        <header className="nl-ov-head">
          <div>
            <h1 className="nl-ov-title">Newsletter</h1>
            <p className="nl-ov-sub">
              Send news and offers to people who signed up on your website.
            </p>
          </div>
          <Link href="/newsletters/write" className="stg-button">
            Write a newsletter
          </Link>
        </header>

        <div className="nl-ov-tiles">
          <div className="nl-ov-tile">
            <p className="nl-ov-tile-label">People signed up</p>
            <p className="nl-ov-tile-value">{counts.subscribed.toLocaleString()}</p>
          </div>
          <div className="nl-ov-tile">
            <p className="nl-ov-tile-label">Last newsletter</p>
            <p className="nl-ov-tile-value">
              {lastSent ? formatDay(lastSent) : "None yet"}
            </p>
          </div>
        </div>

        {/* Links, not buttons: each tab is its own URL. The inbox's segmented
            tabs (.pbm-tabs in mail.css), so both pages switch the same way. */}
        <nav className="pbm-tabs nl-ov-tabs" aria-label="Newsletter">
          <Link
            href="/newsletters"
            className="pbm-tab"
            data-on={!onPeople || undefined}
            aria-current={!onPeople ? "page" : undefined}
          >
            Newsletters
          </Link>
          <Link
            href="/newsletters?tab=people"
            className="pbm-tab"
            data-on={onPeople || undefined}
            aria-current={onPeople ? "page" : undefined}
          >
            People
            <span className="pbm-tab-count">{counts.subscribed.toLocaleString()}</span>
          </Link>
        </nav>

        {people ? (
          <People
            workspaceName={workspace.name}
            counts={counts}
            rows={people.rows}
            hasMore={people.hasMore}
            status={status}
            page={page}
          />
        ) : (
          <ul className="nl-ov-list" aria-label="Newsletters">
            {/*
              The welcome newsletter, pinned first. Not a campaign — it goes
              to one person at the moment they subscribe — but this is where
              a client looks for "the emails my newsletter sends" (Jordan,
              14 Sep 2026), and it sends to real customers unedited.
            */}
            <li className="nl-ov-row">
              <div className="nl-ov-row-text">
                <p className="nl-ov-row-name">Welcome newsletter</p>
                <p className="nl-ov-row-meta">
                  {welcomeSends
                    ? "Sent automatically when someone signs up"
                    : "Off — nobody gets a welcome email"}
                </p>
              </div>
              <Link
                href="/newsletters/welcome"
                className="stg-button stg-button--secondary nl-ov-act"
                aria-label="Edit the welcome newsletter"
              >
                Edit
              </Link>
            </li>
            {campaigns.map((c) => {
              const draft = c.status === "draft";
              return (
                <li key={c.id} className="nl-ov-row">
                  <div className="nl-ov-row-text">
                    <p className="nl-ov-row-name">{c.name || "Untitled"}</p>
                    <p className="nl-ov-row-meta">
                      {c.sentAt
                        ? `Sent ${formatDay(c.sentAt)} to ${c.recipientCount.toLocaleString()} ${
                            c.recipientCount === 1 ? "person" : "people"
                          }`
                        : draft
                          ? "Not sent yet"
                          : STATUS_LABELS[c.status]}
                    </p>
                  </div>
                  {!c.sentAt && (
                    <span className="nl-status" data-status={c.status}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  )}
                  <Link
                    href={`/newsletters/write?id=${c.id}`}
                    className="stg-button stg-button--secondary nl-ov-act"
                    // 2.4.9: "View" and "Keep writing" alone do not say which.
                    aria-label={`${draft ? "Keep writing" : "View"} ${c.name || "Untitled"}`}
                  >
                    {draft ? "Keep writing" : "View"}
                  </Link>
                </li>
              );
            })}
            {campaigns.length === 0 && (
              <li className="nl-ov-empty">
                No newsletters yet. Write one and it appears here.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * "3 Nov", or "3 Nov 2025" outside this year. Formatted on the server, in
 * UK English, which is every workspace today; a date with no time of day
 * carries no timezone risk worth a client island.
 */
function formatDay(d: Date): string {
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "Europe/London",
  });
}
