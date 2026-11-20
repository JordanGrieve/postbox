// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, screen, within } from "@testing-library/react";
import type { LabelWithCountDTO, MailCountsDTO } from "../components/mail/types";

/**
 * Settings in the sidebar (20 Nov 2026 design).
 *
 * One row everywhere; inside Settings, its five sections hang under it and the
 * current one is marked with aria-current. Outside Settings the five are not
 * rendered at all — the sidebar's design problem is length, which is why the
 * row was taken out on 26 Sep 2026 in the first place.
 */

let pathname = "/inbox";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));
vi.mock("@/components/AuditedSignOutButton", () => ({ default: () => null }));

import MailNavShell from "../components/mail/MailNavShell";

const counts = {
  all: 7, unread: 2, awaiting: 1, inbox: 5, closed: 1, sent: 5,
  starred: 0, labeled: 5, snoozed: 0, archived: 1, trash: 4,
} satisfies MailCountsDTO;
const labels = [] satisfies LabelWithCountDTO[];

beforeEach(() => {
  // Desktop: no drawer. happy-dom evaluates no media queries.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});
afterEach(cleanup);

function show(at: string) {
  pathname = at;
  return render(
    <MailNavShell
      workspaceName="Open Door Bakery"
      userLabel="emma@opendoorbakery.co.uk"
      counts={counts}
      labels={labels}
      canPersonalise
      billing={null}
    />,
  );
}

describe("Settings in the sidebar", () => {
  it("is one row outside Settings, with no sections under it", () => {
    show("/inbox");
    const row = screen.getByRole("link", { name: "Settings" });
    expect(row.getAttribute("href")).toBe("/settings");
    expect(screen.queryByRole("list", { name: "Settings sections" })).toBeNull();
  });

  it("shows the five sections inside Settings, marking the current one", () => {
    show("/settings/billing");
    const list = screen.getByRole("list", { name: "Settings sections" });
    const links = within(list).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "Your business",
      "Auto-reply",
      "Team",
      "Website & email",
      "Billing",
    ]);
    const current = links.filter((l) => l.getAttribute("aria-current") === "page");
    expect(current.map((l) => l.textContent)).toEqual(["Billing"]);
  });

  it("marks a section's other pages as that section", () => {
    for (const [path, section] of [
      ["/settings/access-log", "Team"],
      ["/settings/install", "Website & email"],
      ["/settings/labels", "Website & email"],
    ] as const) {
      cleanup();
      show(path);
      const list = screen.getByRole("list", { name: "Settings sections" });
      const current = within(list)
        .getAllByRole("link")
        .filter((l) => l.getAttribute("aria-current") === "page");
      expect(current.map((l) => l.textContent), path).toEqual([section]);
    }
  });
});
