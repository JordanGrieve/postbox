// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent, act, screen, within } from "@testing-library/react";

/**
 * Settings → Auto-reply, read-then-Change (20 Nov 2026 design).
 *
 * The old screen saved the whole config from one button. Each line now sends
 * only its own fields, and the page then shows what the server says is stored
 * — so these tests assert the PATCH bodies exactly, and feed back a stored
 * config that differs from what was sent to prove the page reads the answer.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: () => {}, replace: () => {}, back: () => {}, prefetch: () => {} }),
  usePathname: () => "/settings/auto-reply",
  useSearchParams: () => new URLSearchParams(""),
}));

import AutoReplyDetails from "../app/(dashboard)/settings/auto-reply/AutoReplyDetails";
import { DEFAULT_CONFIG, type AutoReplyConfig } from "../lib/auto-reply";

let fetchMock: ReturnType<typeof vi.fn>;
/** What the fake route answers with: the stored config after the patch. */
let stored: AutoReplyConfig;

beforeEach(() => {
  stored = { ...DEFAULT_CONFIG };
  fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    stored = { ...stored, ...(JSON.parse(String(init.body)) as Partial<AutoReplyConfig>) };
    return new Response(JSON.stringify({ config: stored }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function body(n = 0): unknown {
  const [url, init] = fetchMock.mock.calls[n] as [string, RequestInit];
  expect(url).toBe("/api/auto-reply");
  expect(init.method).toBe("PATCH");
  return JSON.parse(String(init.body));
}

function show(config: Partial<AutoReplyConfig> = {}) {
  stored = { ...DEFAULT_CONFIG, ...config };
  return render(<AutoReplyDetails initialConfig={stored} workspaceName="Open Door Bakery" />);
}

describe("AutoReplyDetails — reading", () => {
  it("reads like the design for a workspace that never set it up", () => {
    show();
    expect(screen.getByRole("heading", { name: "Auto-reply is off" })).toBeTruthy();
    expect(screen.getByText("Every new message, any time")).toBeTruthy();
    expect(screen.getByText("Monday to Friday, 09:00–17:00 (UK time)")).toBeTruthy();
    // Tokens read as their labels, not their codes.
    expect(screen.getByText("We got your message, {First name}")).toBeTruthy();
    expect(screen.getByText("Don’t send one — they’ve already been answered")).toBeTruthy();
  });

  it("says the closed-hours message is unused when nothing goes out while closed", () => {
    show({ scheduleMode: "business_hours" });
    expect(screen.getByText("Not used — nothing goes out while you’re closed")).toBeTruthy();
  });
});

describe("AutoReplyDetails — each line saves only itself", () => {
  it("Turn on sends just { enabled: true } and the card follows the answer", async () => {
    show();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    });
    expect(body()).toEqual({ enabled: true });
    expect(screen.getByRole("heading", { name: "Auto-reply is on" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Turn off" })).toBeTruthy();
  });

  it("Send it to saves the schedule alone", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Change send it to" }));
    fireEvent.click(screen.getByRole("radio", { name: "Only while you’re open" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(body()).toEqual({ scheduleMode: "business_hours" });
    expect(screen.getByText("Only while you’re open")).toBeTruthy();
    expect(screen.getByText("Saved.")).toBeTruthy();
  });

  it("Opening hours saves days, times and zone together, Monday-first in the editor", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Change opening hours" }));
    const days = within(screen.getByRole("group", { name: "Opening hours" })).getAllByRole("button");
    expect(days.map((d) => d.textContent)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    fireEvent.click(days[5]!); // Saturday on
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(body()).toEqual({
      businessHours: { days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "17:00" },
      timezone: "Europe/London",
    });
    expect(screen.getByText("Monday to Saturday, 09:00–17:00 (UK time)")).toBeTruthy();
  });

  it("Message saves subject and body, and refuses a blank one", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Change message" }));
    const subject = screen.getByRole("textbox", { name: "Subject" });
    fireEvent.change(subject, { target: { value: "" } });
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(subject, { target: { value: "Thanks, {first_name}" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(body()).toEqual({ subject: "Thanks, {first_name}", body: DEFAULT_CONFIG.body });
    expect(screen.getByText("Thanks, {First name}")).toBeTruthy();
  });

  it("the teammate rule saves the boolean alone", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Change if a teammate has already replied" }));
    fireEvent.click(screen.getByRole("radio", { name: "Send one anyway" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(body()).toEqual({ skipIfTeammateReplied: false });
  });

  it("shows the server's refusal and keeps the editor open", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Subject is too long (200 character max)." }), { status: 400 }),
    );
    show();
    fireEvent.click(screen.getByRole("button", { name: "Change message" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Subject" }), { target: { value: "x" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(screen.getByRole("alert").textContent).toContain("Subject is too long");
    expect(screen.getByRole("textbox", { name: "Subject" })).toBeTruthy();
  });
});

describe("AutoReplyDetails — reveals", () => {
  it("See the list shows the guards and saves nothing", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "See the list of who never gets an auto-reply" }));
    expect(screen.getByText(/role or bounce addresses/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hide the list" }));
    expect(screen.queryByText(/role or bounce addresses/)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the preview renders with the send path's merge values", () => {
    show();
    const toggle = screen.getByRole("button", { name: "Preview what customers get" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("We got your message, Alex")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "No name" }));
    expect(screen.getByText("We got your message, there")).toBeTruthy();
  });
});
