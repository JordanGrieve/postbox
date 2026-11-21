import { Suspense } from "react";
import { requireAdmin } from "@/lib/viewer";
import AuthProvider from "@/components/AuthProvider";
import AppGround from "@/components/skeletons/AppGround";
import "../admin.css";

/**
 * Admin-only chrome. requireAdmin() redirects any non-admin (a tenant client)
 * back to their own dashboard, so everything under (admin) is operator-only.
 *
 * The console is always dark, whatever theme the workspace is on, so it carries
 * its own data-theme instead of inheriting the document's. The dark palette is
 * restated on .pba-root in app/admin.css — globals.css only declares it at
 * :root, where an element-level attribute can't reach it.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The admin check waits inside a boundary this layout owns; see
  // components/skeletons/AppGround.tsx for why the root no longer has one.
  return (
    <Suspense fallback={<AppGround label="Loading the admin console" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <AuthProvider>
      <div className="pba-root" data-theme="dark">
        {children}
      </div>
    </AuthProvider>
  );
}
