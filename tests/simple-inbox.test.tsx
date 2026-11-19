// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import MessageList from "../components/mail/MessageList";
import Thread from "../components/mail/Thread";
import { parseInboxView } from "../app/(dashboard)/queries";
import type { MailRow, ContactCard } from "../components/mail/types";
import type { TicketDTO } from "../lib/serialize";

/*
  The simple inbox, Jordan, 18 Nov 2026, from a mockup: the dashboard was
  "too complicated". Inbox with two tabs (To reply, Done), a card that is
  who / when / what / from, and a conversation whose one decision is "Mark
  as done". Labels, stars, unread, snooze, archive, trash and Sent were
  removed from the interface.
*/

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/inbox",
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

const row = {
  id: 7,
  name: "Lesley Calder",
  email: "lesley@example.com",
  subject: "Website contact form",
  preview: "Hope you are well. We're still only getting the one sourdough",
  time: "2h",
  sentTime: null,
  sentPreview: "",
  source: "contact_form",
  status: "open",
  orderId: null,
  awaitingReply: true,
  unread: true,
  starred: true,
  labels: [{ id: 1, name: "Wholesale", color: "tag_a", colorHex: null }],
} satisfies MailRow;

describe("the list", () => {
  it("has two tabs, To reply and Done, as links with their counts", () => {
    render(
      <MessageList rows={[row]} view="inbox" counts={{ toReply: 2, done: 1 }} page={1} pageCount={1} total={2} />,
    );
    const toReply = screen.getByRole("link", { name: /To reply/ });
    const done = screen.getByRole("link", { name: /Done/ });
    expect(toReply.getAttribute("href")).toBe("/inbox");
    expect(done.getAttribute("href")).toBe("/inbox?folder=closed");
    expect(toReply.getAttribute("aria-current")).toBe("page");
    expect(done.hasAttribute("aria-current")).toBe(false);
    expect(toReply.textContent).toContain("2");
    expect(done.textContent).toContain("1");
  });

  it("a card is who, when, what they said and where from — no star, labels or unread dot", () => {
    const { container } = render(
      <MessageList rows={[row]} view="inbox" counts={{ toReply: 1, done: 0 }} page={1} pageCount={1} total={1} />,
    );
    const card = container.querySelector(".pbm-card")!;
    expect(card.textContent).toContain("Lesley Calder");
    expect(card.textContent).toContain("2h");
    expect(card.textContent).toContain("still only getting the one sourdough");
    expect(card.textContent).toContain("from contact form");
    expect(container.querySelector(".pbm-card-star, .pbm-label, .pbm-dot, .pbm-tag")).toBeNull();
    expect(container.textContent).not.toContain("Wholesale");
    // The Done tab is carried into the conversation link, so Back returns there.
    expect(card.getAttribute("href")).toBe("/tickets/7?page=1");
  });

  it("only To reply and Done are reachable; any other ?folder= lands on To reply", () => {
    expect(parseInboxView("closed")).toBe("closed");
    for (const v of [undefined, "inbox", "trash", "starred", "archived", "snoozed", "sent", "all"]) {
      expect(parseInboxView(v)).toBe("inbox");
    }
  });

  it("To reply does not hide conversations that were archived or snoozed before", () => {
    // Archive and snooze cannot be undone from the interface any more, so the
    // inbox must not keep excluding them — in its list or its count.
    const q = read("app/(dashboard)/queries.ts");
    expect(q).toMatch(/const WORKING_FOLDERS: MailFolder\[\] = \["unread", "awaiting"\];/);
    const inboxCount = q.match(/\n\s*inbox: sql<number>`([^`]*)`/)?.[1] ?? "";
    expect(inboxCount, "no inbox count found").toContain("notClosed");
    expect(inboxCount).not.toMatch(/notArchived|notSnoozed/);
  });
});

const ticket = {
  id: 7,
  customerName: "Lesley Calder",
  customerEmail: "lesley@example.com",
  subject: "Website contact form",
  status: "open",
  source: "contact_form",
  orderId: null,
} as Partial<TicketDTO> as TicketDTO;
const contact = {
  name: "Lesley Calder",
  email: "lesley@example.com",
  firstSeenIso: null,
  ticketCount: 3,
} satisfies ContactCard;

function showThread(status: "open" | "closed") {
  return render(
    <Thread
      ticket={{ ...ticket, status }}
      messages={[]}
      fromAddress="Open Door Bakery <replies@postbox.help>"
      contact={contact}
      notes={[]}
      addNote={vi.fn()}
      deleteNote={vi.fn()}
      backHref="/inbox"
    />,
  );
}

describe("the conversation", () => {
  it("Mark as done closes it, and the header has nothing else but Details", async () => {
    const calls: { url: string; body: unknown }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
        return new Response("{}", { status: 200 });
      }),
    );
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    const { container } = showThread("open");

    const actions = container.querySelector(".pbm-thread-actions")!;
    const names = [...actions.querySelectorAll("button")].map((b) => b.textContent?.trim() || b.getAttribute("aria-label"));
    expect(names).toEqual(["Mark as done", "Show details"]);

    fireEvent.click(screen.getByRole("button", { name: "Mark as done" }));
    await vi.waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0]).toEqual({ url: "/api/tickets/7/status", body: { status: "closed" } });
    expect(screen.getByRole("button", { name: "Reopen" })).toBeTruthy();
  });

  it("a Done conversation offers Reopen, which opens it", async () => {
    const calls: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init?: RequestInit) => {
        calls.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response("{}", { status: 200 });
      }),
    );
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    showThread("closed");
    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    await vi.waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0]).toEqual({ status: "open" });
  });
});

describe("the conversation's button stays truthful (CodeRabbit, PR 29)", () => {
  const stubMatchMedia = () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
  };
  const props = {
    messages: [],
    fromAddress: "Open Door Bakery <replies@postbox.help>",
    contact,
    notes: [],
    addNote: vi.fn(),
    deleteNote: vi.fn(),
    backHref: "/inbox",
  };

  it("follows the server when a refresh brings a new status", () => {
    stubMatchMedia();
    const { rerender } = render(<Thread {...props} ticket={{ ...ticket, status: "open" }} />);
    expect(screen.getByRole("button", { name: "Mark as done" })).toBeTruthy();
    // A colleague marked it done; the refresh hands down the new status.
    rerender(<Thread {...props} ticket={{ ...ticket, status: "closed" }} />);
    expect(screen.getByRole("button", { name: "Reopen" })).toBeTruthy();
  });

  it("a dropped connection puts the button back and says so", async () => {
    stubMatchMedia();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    render(<Thread {...props} ticket={{ ...ticket, status: "open" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark as done" }));
    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Couldn't mark this as done."));
    const btn = screen.getByRole("button", { name: "Mark as done" }) as HTMLButtonElement;
    expect(btn.disabled, "the button is stuck disabled").toBe(false);
  });
});

describe("the conversation pane, like the mockup (19 Nov 2026)", () => {
  const stubMatchMedia = () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
  };
  const messages = [
    {
      id: 1,
      direction: "inbound",
      body: "Could I reserve two loaves?",
      sentAtIso: "2026-11-19T09:12:00.000Z",
      deliveryStatus: null,
    },
    {
      id: 2,
      direction: "outbound",
      body: "Of course.",
      sentAtIso: "2026-11-19T09:20:00.000Z",
      deliveryStatus: "delivered",
    },
  ] as unknown as Parameters<typeof Thread>[0]["messages"];

  it("has no subject row, puts who and when above each message, and labels the reply card", () => {
    stubMatchMedia();
    const { container } = render(
      <Thread
        ticket={{ ...ticket, status: "open" }}
        messages={messages}
        fromAddress="Open Door Bakery <replies@postbox.help>"
        contact={contact}
        notes={[]}
        addNote={vi.fn()}
        deleteNote={vi.fn()}
        backHref="/inbox"
      />,
    );
    expect(container.querySelector(".pbm-thread-subject, .pbm-subject")).toBeNull();
    const rows = [...container.querySelectorAll(".pbm-bubble-wrap")];
    // The meta line comes BEFORE the bubble in each row.
    for (const r of rows) {
      expect(r.firstElementChild?.className).toBe("pbm-bubble-meta");
    }
    expect(rows[0]!.textContent).toMatch(/^Lesley · /);
    expect(rows[1]!.querySelector(".pbm-bubble-meta")!.textContent).toMatch(/^You · .* · Delivered$/);
    // The textarea is named by the card's visible label.
    expect(screen.getByLabelText("Reply to Lesley").tagName).toBe("TEXTAREA");
    expect(container.querySelector(".pbm-composer-foot")!.textContent).toContain(
      "Sends as Open Door Bakery and moves this to Done.",
    );
  });

  it("a sent reply shows the conversation as Done", async () => {
    stubMatchMedia();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ emailSent: true }), { status: 201 })),
    );
    render(
      <Thread
        ticket={{ ...ticket, status: "open" }}
        messages={[]}
        fromAddress="Open Door Bakery <replies@postbox.help>"
        contact={contact}
        notes={[]}
        addNote={vi.fn()}
        deleteNote={vi.fn()}
        backHref="/inbox"
      />,
    );
    fireEvent.change(screen.getByLabelText("Reply to Lesley"), { target: { value: "Thanks!" } });
    fireEvent.click(screen.getByRole("button", { name: /Send/ }));
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Reopen" })).toBeTruthy());
  });
});

describe("the nav", () => {
  it("is four rows: Inbox, Newsletters, Subscribers, Settings", () => {
    const nav = read("components/mail/MailNavShell.tsx");
    const folders = nav.slice(nav.indexOf('<div className="pbm-folders">'), nav.indexOf('<div className="pbm-nav-spacer"'));
    const hrefs = [...folders.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(["/inbox", "/newsletters", "/subscribers", "/settings"]);
  });
});
