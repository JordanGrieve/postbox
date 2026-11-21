"use client";

import { usePathname } from "next/navigation";
import MarketingSkeleton from "@/components/skeletons/MarketingSkeleton";
import "./skeleton.css";

/**
 * The root boundary: the homepage's skeleton on "/", and a blank app ground
 * everywhere else.
 *
 * ── WHY IT IS NOT JUST THE HOMEPAGE ──
 * A loading.tsx wraps the pages and the NESTED layouts below its folder, but
 * not the layout in its own folder (node_modules/next/dist/docs, file
 * conventions → loading.js). So app/(dashboard)/loading.tsx and every
 * skeleton under it sit INSIDE app/(dashboard)/layout.tsx, and cannot cover
 * it. That layout awaits resolveViewer() and mailCounts(); the console's
 * awaits requireAdmin(). While they run, the nearest boundary is this file.
 *
 * Until 21 Nov 2026 this drew the marketing homepage unconditionally, so a
 * cold load of /inbox, /tickets/5 or /admin — and every arrival from sign-in
 * — flashed the public nav and hero before the app appeared. Off "/" it now
 * draws nothing but the ground the app paints, which is honest about not
 * knowing which shell is coming: the inbox, the console and the legal pages
 * all look different.
 *
 * A client component only for the pathname.
 */
export default function Loading() {
  const pathname = usePathname();
  if (pathname === "/") {
    return <MarketingSkeleton label="Loading Postbox" lines={3} block={280} />;
  }
  return (
    <div
      className="pbk"
      aria-busy="true"
      aria-label="Loading"
      style={{ minHeight: "100vh", background: "var(--app-bg)" }}
    >
      <div aria-hidden />
    </div>
  );
}
