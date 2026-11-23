import { redirect } from "next/navigation";
import MessageList from "@/components/mail/MessageList";
import OnboardingChecklist from "@/components/mail/OnboardingChecklist";
import OnboardingDismiss from "@/components/mail/OnboardingDismiss";
import { getOnboardingProgress } from "@/lib/onboarding-query";
import { resolveViewer } from "@/lib/viewer";
import { TICKETS_PAGE_SIZE } from "@/lib/data";
import { inboxTitle } from "@/lib/page-metadata";
import { listMailPage, mailCounts, parseInboxView, toMailRow } from "../queries";

/*
  "Inbox (3)": the count waiting for a reply, in the tab. mailCounts and
  resolveViewer are React cache()d, so the page below reuses these reads.
*/
export async function generateMetadata() {
  const viewer = await resolveViewer();
  if (!viewer.workspace) return { title: "Inbox" };
  const counts = await mailCounts(viewer.workspace.id);
  return { title: inboxTitle(counts.inbox) };
}

/**
 * Desktop shows the list beside a "pick a thread" placeholder; the phone shows
 * only the list (the placeholder is hidden by mail.css). The thread route
 * renders the same list pane so the two-pane desktop layout survives
 * navigation.
 */
export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; page?: string }>;
}) {
  const { folder: folderParam, page: pageParam } = await searchParams;
  // To reply or Done; nothing else is offered (18 Nov 2026).
  const view = parseInboxView(folderParam);
  const page = Math.max(1, Number(pageParam) || 1);

  const viewer = await resolveViewer();
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");
  const workspaceId = viewer.workspace.id;

  const [counts, onboarding] = await Promise.all([
    mailCounts(workspaceId),
    // In the Promise.all rather than awaited after it: this renders on every
    // inbox load, and neon-http gives each statement its own HTTP request, so
    // sequencing it would add a whole round trip to the page for nothing.
    getOnboardingProgress(workspaceId),
  ]);

  const total = counts[view];
  const pageCount = Math.max(1, Math.ceil(total / TICKETS_PAGE_SIZE));
  /*
    Clamped BEFORE the rows are read, not only for display. Marking the last
    conversation on the last page as done leaves ?page= one past the end; the
    list used to fetch that empty page and say "All caught up" over a tab
    that still had conversations. (CodeRabbit, PR 29.)
  */
  const shownPage = Math.min(page, pageCount);
  const rows = await listMailPage(workspaceId, view, shownPage);
  const now = new Date();

  return (
    <>
      <MessageList
        rows={rows.map((r) => toMailRow(r, now))}
        view={view}
        counts={{ toReply: counts.inbox, done: counts.closed }}
        page={shownPage}
        pageCount={pageCount}
        total={total}
      />
      {/*
        The empty thread pane is the only screen space genuinely doing nothing:
        on a new workspace it invites you to pick from a list with nothing in
        it. While setup is outstanding it carries the checklist instead, and
        reverts to the placeholder once the required steps are done.
      */}
      <section className="pbm-thread pbm-thread--empty" data-hide-mobile>
        {/* OnboardingDismiss owns the whole block rather than just a button,
            so dismissing leaves no empty container behind. */}
        {onboarding && !onboarding.complete ? (
          <OnboardingDismiss>
            <OnboardingChecklist progress={onboarding} />
          </OnboardingDismiss>
        ) : (
          <>
            <p className="pbm-placeholder-title">No thread open</p>
            <p className="pbm-placeholder-body">
              Pick a message on the left to read the conversation and reply.
            </p>
          </>
        )}
      </section>
    </>
  );
}
