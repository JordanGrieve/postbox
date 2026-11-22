import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ticket, Workspace } from "@/db/schema";
import type { RateLimitResult } from "@/lib/rate-limit";

/**
 * A reply sent to our From address (replies@) instead of the per-ticket
 * Reply-To.
 *
 * 22 Nov 2026 journey test: a customer's reply that went to replies@ — what a
 * mail client that ignores Reply-To does, and what a reply-tool that answers
 * "From" does — matched no ticket token and no workspace address, and the
 * route answered `ignored`. No ticket, no message, no trace: the customer's
 * reply was simply gone.
 *
 * Now its In-Reply-To / References are matched against the Message-IDs the
 * conversation already holds (the customer's own first email, and ours,
 * learned from their earlier replies). Those ids are only known to the people
 * in the conversation, which is what makes threading on them safe where
 * threading on a guessable ticket id would not be. No match, or more than one
 * conversation, and it is still not guessed into anybody's inbox.
 */

const SECRET = "inbound-from-reply-secret";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
  },
}));
vi.mock("@/lib/config", () => ({
  EMAIL_FROM_ADDRESS: "replies@postbox.test",
  INBOUND_DOMAIN: "inbound.test",
  PUBLIC_CONTACT_LOCAL_PART: "hello",
  POSTBOX_CONTACT_KEY: null,
}));
vi.mock("@/lib/svix", () => ({ verifySvixSignature: vi.fn(() => false) }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitDurable: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifyWorkspace: vi.fn() }));
vi.mock("@/lib/auto-reply-send", () => ({ maybeSendAutoReply: vi.fn() }));
vi.mock("@/lib/data", () => ({
  getWorkspaceByInboundEmail: vi.fn(async () => null),
  getWorkspaceById: vi.fn(),
  getTicket: vi.fn(),
  createTicket: vi.fn(),
  addMessage: vi.fn(),
  upsertContact: vi.fn(),
  backfillOutboundMessageId: vi.fn(),
  messageIdExists: vi.fn(async () => false),
  findTicketByReferencedMessageIds: vi.fn(),
}));

const { POST } = await import("@/app/api/inbound/route");
const { rateLimitDurable } = await import("@/lib/rate-limit-store");
const data = await import("@/lib/data");

const bakery = { id: 42, name: "Bakery", inboundEmail: "bakery@inbound.test" } satisfies Partial<Workspace> as Workspace;
const ticket86 = { id: 86, workspaceId: 42 } satisfies Partial<Ticket> as Ticket;
const allowed = { ok: true, remaining: 5, limit: 60, retryAfterSeconds: 0 } satisfies RateLimitResult;

function replyToFromAddress(headers: Record<string, string>) {
  return POST(
    new Request("http://postbox.test/api/inbound", {
      method: "POST",
      headers: { "x-webhook-secret": SECRET },
      body: JSON.stringify({
        from: "Casey <casey@example.com>",
        to: ["replies@postbox.test"],
        subject: "Re: Table for six on Saturday?",
        text: "Could we make it 7:30?",
        message_id: "<casey-2@example.com>",
        headers,
      }),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.INBOUND_WEBHOOK_SECRET = SECRET;
  delete process.env.RESEND_WEBHOOK_SIGNING_SECRET;
  vi.mocked(rateLimitDurable).mockResolvedValue(allowed);
  vi.mocked(data.getWorkspaceById).mockResolvedValue(bakery);
});

describe("a reply sent to replies@", () => {
  it("threads into the conversation its headers reference", async () => {
    vi.mocked(data.findTicketByReferencedMessageIds).mockResolvedValue(ticket86);
    const res = await replyToFromAddress({
      "In-Reply-To": "<0102-ours@eu-west-1.amazonses.com>",
      References: "<casey-1@example.com> <0102-ours@eu-west-1.amazonses.com>",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ threadedInto: 86 });
    expect(vi.mocked(data.findTicketByReferencedMessageIds).mock.calls[0][0]).toEqual([
      "<0102-ours@eu-west-1.amazonses.com>",
      "<casey-1@example.com>",
    ]);
    expect(vi.mocked(data.addMessage).mock.calls[0][0]).toMatchObject({
      ticketId: 86,
      direction: "inbound",
      status: "open",
    });
  });

  it("does not guess when nothing matches, and says so rather than 'ok'", async () => {
    vi.mocked(data.findTicketByReferencedMessageIds).mockResolvedValue(null);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await replyToFromAddress({ "In-Reply-To": "<unknown@example.com>" });
    expect(await res.json()).toMatchObject({ ignored: true, reason: "unrouted-reply" });
    expect(data.addMessage).not.toHaveBeenCalled();
    expect(data.createTicket).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not look anything up for mail with no reply headers at all", async () => {
    const res = await replyToFromAddress({});
    expect(data.findTicketByReferencedMessageIds).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ ignored: true });
  });
});
