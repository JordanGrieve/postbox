/**
 * How Settings is organised: five sections in the sidebar, each owning one or
 * more pages.
 *
 * ── WHY SECTIONS AND NOT A FLAT LIST ──
 * Settings was nine peer tabs in a strip across the top of every page. The
 * design of 20 Nov 2026 moves it into the sidebar as five sub-items — Your
 * business, Auto-reply, Notifications, Team, Email & forms — which is how a
 * client thinks about it. Nine pages still exist, so each section owns the
 * pages that belong with it; a section with more than one shows them as a small
 * row of tabs inside the page (SettingsTabs).
 *
 * One definition, read by both the sidebar (components/mail/MailNavShell.tsx)
 * and the in-page tabs, so the two cannot disagree about where a page lives.
 * tests/settings-sections.test.ts walks the route tree and fails if a settings
 * page belongs to no section, or to two.
 *
 * Pure data and a pure lookup: imported by client components.
 */

export type SettingsPage = { href: string; label: string };

export type SettingsSection = {
  key: "business" | "auto-reply" | "notifications" | "team" | "email";
  label: string;
  /** Where the sidebar item goes: the section's first page. */
  href: string;
  pages: readonly SettingsPage[];
};

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    key: "business",
    label: "Your business",
    href: "/settings",
    pages: [
      // Not "Details": a link has to say what it opens from its own words
      // (2.4.9), and __links() flags a bare "Details" as generic.
      { href: "/settings", label: "Business details" },
      { href: "/settings/billing", label: "Plan & billing" },
    ],
  },
  {
    key: "auto-reply",
    label: "Auto-reply",
    href: "/settings/auto-reply",
    pages: [{ href: "/settings/auto-reply", label: "Auto-reply" }],
  },
  {
    key: "notifications",
    label: "Notifications",
    href: "/settings/notifications",
    pages: [{ href: "/settings/notifications", label: "Notifications" }],
  },
  {
    key: "team",
    label: "Team",
    href: "/settings/team",
    pages: [
      { href: "/settings/team", label: "Team" },
      // Who from Postbox looked inside the workspace: the other half of "who
      // has access", so it sits with the people who do.
      { href: "/settings/access-log", label: "Access log" },
    ],
  },
  {
    key: "email",
    label: "Email & forms",
    href: "/settings/install",
    pages: [
      // Forwarding your inbox and putting the form on your site.
      { href: "/settings/install", label: "Connect" },
      { href: "/settings/forms", label: "Forms" },
      // Both are about the mail that arrives: how it is sorted, and who sent it.
      { href: "/settings/labels", label: "Labels" },
      { href: "/settings/contacts", label: "Contacts" },
    ],
  },
];

/**
 * The section a path belongs to, or null outside Settings.
 *
 * Exact page match first; then the longest page href that prefixes the path,
 * so a nested route (/settings/team/invite, should one appear) still lights up
 * its section rather than nothing. `/settings` itself only matches exactly —
 * otherwise every settings page would claim to be "Your business".
 */
export function settingsSectionFor(pathname: string): SettingsSection | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  let best: { section: SettingsSection; length: number } | null = null;
  for (const section of SETTINGS_SECTIONS) {
    for (const page of section.pages) {
      if (path === page.href) return section;
      if (page.href !== "/settings" && path.startsWith(`${page.href}/`)) {
        if (!best || page.href.length > best.length) {
          best = { section, length: page.href.length };
        }
      }
    }
  }
  return best?.section ?? null;
}
