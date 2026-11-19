import { describe, it, expect, vi, beforeEach } from "vitest";

/*
  Sending a reply moves the conversation to Done (19 Nov 2026, Jordan's
  mockup: "Sends as {business} and moves this to Done. If they write back,
  it comes back to To reply"). Only when the email actually left: a reply
  that failed to send stays in To reply, so a message the customer never
  received is not filed away as handled.

  The real route, with its collaborators stood in for, so the test checks
  the status it hands to addMessage.
*/

const h = vi.hoisted(() => ({
  sendReplyEmail: vi.fn(),
  addMessage: vi.fn(async (m: unknown) => m),
  ticket: { id: 5, status: "open", subject: "Hello", customerEmail: "c@example.com", replyToken: "t" },
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "u1" }) }));
vi.mock("@/lib/viewer", () => ({ activeWorkspace: async () => ({ id: 3, name: "Open Door Bakery" }) }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitDurable: async () => ({ ok: true }) }));
vi.mock("@/lib/email", () => ({ sendReplyEmail: h.sendReplyEmail }));
vi.mock("@/lib/tickets", () => ({ buildReplyTo: () => "reply+5@postbox.help" }));
vi.mock("@/lib/config", () => ({ EMAIL_FROM_ADDRESS: "replies@postbox.help" }));
vi.mock("@/lib/data", () => ({
  getTicket: async () => h.ticket,
  getMessages: async () => ({ messages: [], hasMore: false }),
  addMessage: h.addMessage,
}));

async function reply(): Promise<{ status: string }> {
  const { POST } = await import("../app/api/tickets/[id]/reply/route");
  const req = new Request("http://x/api/tickets/5/reply", {
    method: "POST",
    body: JSON.stringify({ message: "Thanks, see you Saturday." }),
  });
  const res = await POST(req, { params: Promise.resolve({ id: "5" }) } as never);
  expect(res.status).toBe(201);
  return h.addMessage.mock.calls.at(-1)![0] as { status: string };
}

beforeEach(() => {
  h.addMessage.mockClear();
  h.ticket.status = "open";
});

describe("replying", () => {
  it("moves the conversation to Done when the email leaves", async () => {
    h.sendReplyEmail.mockResolvedValue({ sent: true, id: "re_1" });
    expect((await reply()).status).toBe("closed");
  });

  it("keeps it in To reply when the email did not leave", async () => {
    h.sendReplyEmail.mockResolvedValue({ sent: false, error: "not configured" });
    expect((await reply()).status).toBe("in_progress");
  });

  it("a Done conversation stays Done even if the send fails", async () => {
    h.ticket.status = "closed";
    h.sendReplyEmail.mockResolvedValue({ sent: false, error: "not configured" });
    expect((await reply()).status).toBe("closed");
  });
});
