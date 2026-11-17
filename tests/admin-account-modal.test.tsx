// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("is centred: its rule puts back the margin the base reset removes", () => {
    /*
      happy-dom does not lay out from stylesheets, so this reads the rule.
      The reset in globals.css zeroes every element's margin, and a modal
      dialog is centred by `margin: auto`; without it the modal shipped
      pinned to the top-left of the live console.
    */
    const css = readFileSync(join(process.cwd(), "app/admin.css"), "utf8");
    const at = css.indexOf(".pba-modal {");
    expect(at, "app/admin.css has no .pba-modal rule").toBeGreaterThan(-1);
    const rule = css.slice(at, css.indexOf("}", at));
    expect(rule).toMatch(/(^|;|\s)margin:\s*auto;/);
  });

  it("stays open on a click inside its content", () => {
    const dialog = show();
    fireEvent.click(screen.getByRole("button", { name: "Details for Open Door Bakery" }));
    fireEvent.click(within(dialog).getByRole("heading", { name: "Open Door Bakery" }));
    expect(dialog.open).toBe(true);
  });
});

/*
  17 Nov 2026: the impersonate reason gets a visible label, the newsletter
  state line goes, and on a phone the modal is a bottom sheet that drags
  down to close.
*/
function openAmoria() {
  const dialog = show();
  fireEvent.click(screen.getByRole("button", { name: "Details for Amoria" }));
  expect(dialog.open).toBe(true);
  return dialog;
}

describe("account details content", () => {
  it("names the impersonate reason field with a visible label", () => {
    const dialog = openAmoria();
    const field = within(dialog).getByLabelText(/why are you going in/i);
    expect(field.getAttribute("name")).toBe("reason");
    // A real <label> element, not only an aria-label: it is on screen.
    expect(dialog.querySelector(`label[for="${field.id}"]`)).not.toBeNull();
  });

  it("no longer states the newsletter signup mode above its button", () => {
    const dialog = openAmoria();
    expect(within(dialog).queryByText(/newsletter signups/i)).toBeNull();
    // The switch itself is still there.
    expect(
      within(dialog).getByRole("button", { name: /require a confirmation link/i }),
    ).toBeTruthy();
  });
});

describe("the bottom sheet's grab bar", () => {
  function grip(dialog: HTMLElement) {
    const el = within(dialog).getByRole("button", {
      name: "Drag down to close account details",
    });
    // happy-dom builds a PointerEvent but has no pointer capture.
    el.setPointerCapture = vi.fn();
    el.hasPointerCapture = vi.fn(() => false);
    el.releasePointerCapture = vi.fn();
    return el;
  }

  it("closes the sheet when dragged down past the threshold", () => {
    const dialog = openAmoria();
    const el = grip(dialog);
    fireEvent.pointerDown(el, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(el, { clientY: 260, pointerId: 1 });
    fireEvent.pointerUp(el, { pointerId: 1 });
    expect(dialog.open).toBe(false);
  });

  it("springs back on a short drag, and the sheet follows the finger meanwhile", () => {
    const dialog = openAmoria();
    const el = grip(dialog);
    fireEvent.pointerDown(el, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(el, { clientY: 150, pointerId: 1 });
    expect(dialog.style.transform).toBe("translateY(50px)");
    fireEvent.pointerUp(el, { pointerId: 1 });
    expect(dialog.open).toBe(true);
    expect(dialog.style.transform).toBe("");
  });
});

describe("dragging the sheet by its body, at phone width", () => {
  // The body gesture is wired only where the CSS makes it a sheet.
  const matchMedia = vi.spyOn(window, "matchMedia");
  afterEach(() => matchMedia.mockReset());

  function phone(matches: boolean) {
    matchMedia.mockImplementation(
      (query: string) =>
        ({
          matches: query === "(max-width: 640px)" ? matches : false,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) satisfies MediaQueryList,
    );
  }

  function pull(body: Element, from: number, to: number) {
    fireEvent.touchStart(body, { touches: [{ clientX: 50, clientY: from }] });
    fireEvent.touchMove(body, { touches: [{ clientX: 50, clientY: to }] });
    fireEvent.touchEnd(body, { touches: [] });
  }

  it("closes on a long downward pull from the top of the body", () => {
    phone(true);
    const dialog = openAmoria();
    const body = dialog.querySelector(".pba-modal-inner")!;
    expect(body, "the sheet has no scrolling body").not.toBeNull();
    pull(body, 100, 300);
    expect(dialog.open).toBe(false);
  });

  it("does nothing above phone width, where it is a centred modal", () => {
    phone(false);
    const dialog = openAmoria();
    pull(dialog.querySelector(".pba-modal-inner")!, 100, 300);
    expect(dialog.open).toBe(true);
  });
});
