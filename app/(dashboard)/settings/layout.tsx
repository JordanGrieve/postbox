import SettingsBackLink from "./SettingsBackLink";
import "../../settings.css";

/**
 * Shared chrome for every settings page: the scroll pane, the stylesheet, and
 * a link back to the section's first page when you are on one of its others.
 *
 * Deliberately no page heading: each page renders its own, and a "Settings"
 * title above an "Auto-reply" title is one heading too many. The highlighted
 * sidebar item says where you are.
 *
 * There was a row of tabs here, one per page in the section. Jordan took it
 * out on 21 Nov 2026; the section's first page links to its other pages from
 * its rows instead.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pbm-page pb-scroll">
      <SettingsBackLink />
      {children}
    </div>
  );
}
