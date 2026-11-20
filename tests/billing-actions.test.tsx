// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent, act, screen } from "@testing-library/react";

/**
 * The interactive parts of Settings → Billing (20 Nov 2026 design).
 *
 * Close workspace sends a request and then says so; it never claims anything
 * was closed. Choosing a plan posts only the plan id — the amount comes from
 * Stripe, never the browser — and follows the URL Stripe hands back.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: () => {}, replace: () => {}, back: () => {}, prefetch: () => {} }),
  usePathname: () => "/settings/billing",
  useSearchParams: () => new URLSearchParams(""),
}));

import {
  ChoosePlanRow,
  CloseWorkspaceRow,
} from "../app/(dashboard)/settings/billing/BillingActions";

let fetchMock: ReturnType<typeof vi.fn>;
const assign = vi.fn();

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign },
  });
  assign.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CloseWorkspaceRow", () => {
  it("asks first, sends the reason, and then says a request was sent", async () => {
    render(
      <dl>
        <CloseWorkspaceRow workspaceName="Open Door Bakery" email="emma@opendoorbakery.co.uk" />
      </dl>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close workspace Open Door Bakery" }));
    expect(screen.getByText(/Nothing is deleted until we’ve confirmed with you by email/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Closing the shop" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Ask us to close it" }));
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/workspace/close-request");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ reason: "Closing the shop" });
    expect(screen.getByText("Request sent")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("emma@opendoorbakery.co.uk");
  });

  it("Cancel sends nothing", () => {
    render(
      <dl>
        <CloseWorkspaceRow workspaceName="Open Door Bakery" email="emma@opendoorbakery.co.uk" />
      </dl>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close workspace Open Door Bakery" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Request sent")).toBeNull();
  });
});

describe("ChoosePlanRow", () => {
  it("posts only the plan id and follows Stripe's URL", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/abc" }), { status: 200 }),
    );
    render(
      <dl>
        <ChoosePlanRow
          plans={[
            { id: "starter", name: "Starter", price: 12, tagline: "For one inbox" },
            { id: "growth", name: "Growth", price: 29, tagline: "Adds newsletters" },
          ]}
        />
      </dl>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose a plan to pay by card" }));
    fireEvent.click(screen.getByRole("radio", { name: /Growth/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/billing/checkout");
    expect(JSON.parse(String(init.body))).toEqual({ plan: "growth" });
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/abc");
  });
});
