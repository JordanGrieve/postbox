"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsSectionFor } from "@/lib/settings-sections";

/**
 * "‹ Website & email" above Setup steps, Forms and Access log: the way back to
 * the page that linked to them.
 *
 * Those pages have no sidebar item of their own (the sidebar lists sections,
 * lib/settings-sections.ts), and the tabs that used to connect them were
 * removed on 21 Nov 2026. Without this, the only way back from Setup steps on
 * a phone was the drawer.
 *
 * Renders nothing on a section's own page. A client component only because it
 * needs the pathname.
 */
export default function SettingsBackLink() {
  const pathname = usePathname();
  const section = settingsSectionFor(pathname);
  if (!section || pathname.replace(/\/+$/, "") === section.href) return null;

  return (
    <nav className="stg-back-bar" aria-label="Back">
      <Link prefetch={false} href={section.href} className="stg-back">
        <span aria-hidden>‹</span>
        {section.label}
      </Link>
    </nav>
  );
}
