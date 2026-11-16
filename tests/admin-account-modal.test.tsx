// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import type { WorkspaceSummary } from "../lib/data";
import type { AdminQuery } from "../app/(admin)/admin/ui";

/**
 * The account details modal, ACTUALLY CLICKED.
 *
 * On 16 Nov 2026 the console's always-open details drawer became a modal
 * opened from a Details button on each row. The render harness can draw the
 * modal's content but cannot click, so it cannot tell a modal that opens from
 * one that never does. This renders the real AccountsBrowser and drives it.
 */

// Server Actions are references in the browser bundle; here they only need
// to exist so the forms inside the modal can render.
vi.mock("../app/(admin)/admin/actions", () => ({
  createClientAction: vi.fn(),
  deleteClientAction: vi.fn(),
  rotateKeyAction: vi.fn(),
  setOptInAction: vi.fn(),
  resendInviteAction: vi.fn(),
  selectWorkspaceAction: vi.fn(),
}));

const { default: AccountsBrowser } = await import(
  "../app/(admin)/admin/AccountsBrowser"
);

afterEach(cleanup);

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

const workspace = (over: Partial<WorkspaceSummary> = {}): WorkspaceSummary =>
  ({
    id: 3,
    name: "Open Door Bakery",
    apiKey: "cli_abc123",
    inboundEmail: "bakery@inbound.postbox.help",
    sendingEmail: "hello@opendoorbakery.co.uk",
    accent: "terracotta",
    legalName: "Open Door Bakery Ltd",
    postalAddress: "12 Mill Lane, Stroud, GL5 1AB",
    brandAccentHex: null,
    brandSignOff: null,
    plan: "starter",
    stripeCustomerId: "cus_abc",
    stripeSubscriptionId: "sub_abc",
    subscriptionStatus: "active",
    currentPeriodEnd: ago(-30),
    requireSignupConfirmation: false,
    trialStartedAt: ago(200),
    createdAt: ago(200),
    openCount: 3,
    totalCount: 24,
    ownerEmail: "hello@opendoorbakery.co.uk",
    pending: false,
    firstTicketAt: ago(180),
    lastTicketAt: ago(3),
    ...over,
  }) satisfies WorkspaceSummary;

const accounts = [
  workspace({}),
  workspace({
    id: 4,
    name: "Amoria",
    inboundEmail: "amoria@inbound.postbox.help",
    ownerEmail: "owner@amoria.example",
  }),
] satisfies WorkspaceSummary[];

const query = {
  section: "accounts",
  filter: "all",
  q: "",
  account: null,
} satisfies AdminQuery;

function show() {
  render(
    <AccountsBrowser
      accounts={accounts}
      teamSizes={{ 3: 2, 4: 1 }}
      recentAccess={{}}
      usage={{}}
      reads={{}}
      deleteTarget={null}
      rotateTarget={null}
      query={query}
      banners={null}
    />,
  );
  // hidden: true because a closed <dialog> is not in the accessibility tree.
  return screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
}

describe("account details modal", () => {
  it("is closed and empty until a row's Details button is pressed", () => {
    const dialog = show();
    expect(dialog.open).toBe(false);
    expect(within(dialog).queryByRole("heading", { hidden: true })).toBeNull();
  });

  it("there is no always-open side panel any more", () => {
    show();
    expect(document.querySelector("aside")).toBeNull();
  });

  it("opens on the account that was clicked, named by its heading", () => {
    const dialog = show();
    fireEvent.click(screen.getByRole("button", { name: "Details for Amoria" }));

    expect(dialog.open).toBe(true);
    const heading = within(dialog).getByRole("heading", { name: "Amoria" });
    // aria-labelledby resolves to the heading, so the dialog is announced
    // by the account's name.
    expect(dialog.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(within(dialog).getByText("owner@amoria.example")).toBeTruthy();
    expect(within(dialog).queryByText("Open Door Bakery")).toBeNull();
  });

  it("closes from its close button, and empties", () => {
    const dialog = show();
    fireEvent.click(screen.getByRole("button", { name: "Details for Open Door Bakery" }));
    expect(dialog.open).toBe(true);

    fireEvent.click(within(dialog).getByRole("button", { name: "Close account details" }));
    expect(dialog.open).toBe(false);
    expect(within(dialog).queryByRole("heading", { hidden: true })).toBeNull();
  });

  it("closes on a click on the backdrop, which lands on the dialog itself", () => {
    const dialog = show();
    fireEvent.click(screen.getByRole("button", { name: "Details for Open Door Bakery" }));
    fireEvent.click(dialog);
    expect(dialog.open).toBe(false);
  });

  it("stays open on a click inside its content", () => {
    const dialog = show();
    fireEvent.click(screen.getByRole("button", { name: "Details for Open Door Bakery" }));
    fireEvent.click(within(dialog).getByRole("heading", { name: "Open Door Bakery" }));
    expect(dialog.open).toBe(true);
  });
});
