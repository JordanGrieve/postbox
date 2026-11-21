import "../../app/skeleton.css";

/**
 * The blank app ground, shown while a signed-in layout works out who you are.
 *
 * ── WHERE THIS USED TO LIVE ──
 * app/loading.tsx drew it, because a loading.tsx does not wrap the layout in
 * its own folder: nothing under (dashboard) or (admin) can cover those layouts
 * while they await the viewer, so the ROOT boundary did. But a root boundary
 * sits above every page — the static marketing pages too — and React splits a
 * large page around it: the homepage, pricing and privacy shipped their
 * skeleton first and their real content in a hidden block revealed by script
 * (found with an HTML validator, 21 Nov 2026), which is the render delay the
 * live Lighthouse run measured on the homepage's main content.
 *
 * So the two layouts that actually wait now draw this themselves, in a
 * Suspense boundary around the part that waits (app/(dashboard)/layout.tsx,
 * app/(admin)/layout.tsx), and the root has no boundary at all.
 *
 * It draws nothing but the ground the app paints: honest about not knowing
 * which shell is coming, and no marketing chrome flashing before the inbox.
 */
export default function AppGround({ label }: { label: string }) {
  return (
    <div
      className="pbk"
      role="status"
      aria-busy="true"
      aria-label={label}
      style={{ minHeight: "100vh", background: "var(--app-bg)" }}
    >
      <div aria-hidden />
    </div>
  );
}
