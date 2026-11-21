import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthProvider from "@/components/AuthProvider";
import MailNav from "@/components/mail/MailNav";
import AppGround from "@/components/skeletons/AppGround";
import { resolveViewer } from "@/lib/viewer";
import { ThemeApplier } from "@/components/ThemeApplier";
import ImpersonationBanner from "@/app/(admin)/ImpersonationBanner";
import TrialBanner from "@/components/TrialBanner";
import { mailCounts } from "./queries";
import "../mail.css";

/**
 * The signed-in shell. The waiting — resolveViewer() and mailCounts() — is in
 * DashboardShell, inside a boundary this layout owns, because the loading.tsx
 * files below cannot cover the layout above them and the root no longer has a
 * boundary of its own (components/skeletons/AppGround.tsx says why).
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AppGround label="Loading your inbox" />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

async function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await resolveViewer();
  // Admins without a selected client → overview; uninvited → no-access.
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");

  const workspace = viewer.workspace;
  const userLabel = viewer.isAdmin ? viewer.email : viewer.agentEmail;
  // One grouped COUNT for all four folders.
  const counts = await mailCounts(workspace.id);

  return (
    <AuthProvider>
      {/* Renders null for tenants. Must be a SIBLING immediately before the
          shell: its CSS uses a `~` selector to buy back its own height from
          .pb-shell, which is height:100dvh with overflow hidden. */}
      <ImpersonationBanner />
      {/* Also a SIBLING immediately before the shell, and for the same reason:
          the shell is height:100dvh with overflow hidden, so a banner above it
          buys its own height back through a `~` rule. It must not go inside
          .pb-main — the mail client lays that out as a row, and a banner in
          there becomes a fourth column instead of a bar. Renders null unless
          the workspace is on a trial with a week or less left. */}
      <TrialBanner workspaceId={workspace.id} />
      <div className="pb-shell pbm">
        {/* The `accent` column stores a theme key since the pivot. */}
        <ThemeApplier theme={workspace.accent} />
        {/* Renders its own mobile top bar + scrim; on desktop it is the static
            262px navigation column. */}
        <MailNav
          workspaceName={workspace.name}
          userLabel={userLabel}
          counts={counts}
          isAdmin={viewer.isAdmin}
        />
        <main className="pb-main pbm-main">{children}</main>
      </div>
    </AuthProvider>
  );
}
