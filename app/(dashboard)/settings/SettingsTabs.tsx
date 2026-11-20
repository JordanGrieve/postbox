"use client";

import Link from "next/link";
import DragScroller from "@/components/DragScroller";
import { usePathname } from "next/navigation";
import { settingsSectionFor } from "@/lib/settings-sections";

/**
 * The pages inside the current Settings section, as a small row of tabs.
 *
 * Choosing a SECTION is the sidebar's job now (components/mail/MailNavShell.tsx,
 * from the 20 Nov 2026 design). This strip used to carry all nine pages; it now
 * carries only the pages of the section you are in, and renders nothing for a
 * section that has one page — a single tab is a heading pretending to be a
 * control. Sections and their pages come from lib/settings-sections.ts.
 *
 * A client component only because it needs the pathname. Real links with
 * aria-current, so each page keeps its own URL and is middle-clickable.
 */
export default function SettingsTabs() {
  const pathname = usePathname();
  const section = settingsSectionFor(pathname);
  if (!section || section.pages.length < 2) return null;

  return (
    /*
      Wrapped so a mouse can drag the strip sideways on a narrow screen; touch
      already scrolls it. See components/DragScroller.tsx.
    */
    <DragScroller
      className="pbs-tabs"
      role="navigation"
      aria-label={`${section.label} pages`}
    >
      {section.pages.map((t) => {
        // Exact match: /settings must not light up while on /settings/billing.
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className="pbs-tab"
            data-active={active}
            aria-current={active ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </DragScroller>
  );
}
