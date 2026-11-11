import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ticket, Workspace } from "@/db/schema";
import type { RateLimitResult } from "@/lib/rate-limit";

/**
 * POST /api/inbound was the one public write path with no rate limit
 * (BACKEND-REVIEW S2, 11 Sep 2026). Each accepted message writes a row, sends
 * the workspace a notification and may send an auto-reply.
 *
 * Behavioural, not read from the source: the route is called with a real
 * Request and the assertions are on what it did and did not do.
 */

const SECRET = "inbound-test-secret";

const dbRows = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => dbRows.rows }) }),
    }),
  },
}));
vi.mock("@/lib/config", () => ({
  EMAIL_FROM_ADDRESS: "replies@postbox.test",
  INBOUND_DOMAIN: "inbound.test",
}));
vi.mock("@/lib/svix", () => ({ verifySvixSignature: vi.fn(() => false) }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitDurable: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifyWorkspace: vi.fn() }));
vi.mock("@/lib/auto-reply-send", () => ({ maybeSendAutoReply: vi.fn() }));
vi.mock("@/lib/data", () => ({
  getWorkspaceByInboundEmail: vi.fn(),
  getWorkspaceById: vi.fn(),
  getTicket: vi.fn(),
  createTicket: vi.fn(),
  addMessage: vi.fn(),
  upsertContact: vi.fn(),
  backfillOutboundMessageId: vi.fn(),
  messageIdExists: vi.fn(async () => false),
}));

const { POST } = await import("@/app/api/inbound/route");
const { rateLimitDurable } = await import("@/lib/rate-limit-store");
const data = await import("@/lib/data");
const { notifyWorkspace } = await import("@/lib/notify");
const { maybeSendAutoReply } = await import("@/lib/auto-reply-send");

const workspace = {
  id: 42,
  name: "Bakery",
  inboundEmail: "bakery@inbound.test",
} satisfies Partial<Workspace> as Workspace;

const ticket = {
  id: 9,
  workspaceId: 42,
  replyToken: "abc123",
} satisfies Partial<Ticket> as Ticket;

const allowed = {
  ok: true,
  remaining: 5,
  limit: 60,
  retryAfterSeconds: 0,
} satisfies RateLimitResult;

const refused = {
  ok: false,
  remaining: 0,
  limit: 60,
  retryAfterSeconds: 17,
} satisfies RateLimitResult;

function deliver(to: string) {
  return POST(
    new Request("http://postbox.test/api/inbound", {
      method: "POST",
      headers: { "x-webhook-secret": SECRET },
      body: JSON.stringify({
        from: "Ann <Ann@Example.com>",
        to,
        subject: "Where is my order",
        text: "Hello",
        message_id: "<1@example.com>",
      }),
    }),
  );
}

/** Refuse the bucket whose key starts with this, allow every other. */
function refuseBucket(prefix: string) {
  vi.mocked(rateLimitDurable).mockImplementation(async (key) =>
    key.startsWith(prefix) ? refused : allowed,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.INBOUND_WEBHOOK_SECRET = SECRET;
  delete process.env.RESEND_WEBHOOK_SIGNING_SECRET;
  dbRows.rows = [ticket];
  vi.mocked(data.getWorkspaceByInboundEmail).mockResolvedValue(workspace);
  vi.mocked(data.getWorkspaceById).mockResolvedValue(workspace);
  vi.mocked(data.getTicket).mockResolvedValue(ticket);
  vi.mocked(data.createTicket).mockResolvedValue(ticket);
  vi.mocked(rateLimitDurable).mockResolvedValue(allowed);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("a new email to a workspace address", () => {
  it("is accepted, and counted in a workspace bucket and a sender bucket", async () => {
    const res = await deliver("bakery@inbound.test");

    expect(res.status).toBe(201);
    expect(data.createTicket).toHaveBeenCalledTimes(1);
    const keys = vi.mocked(rateLimitDurable).mock.calls.map((c) => c[0]);
    expect(keys).toEqual(["inbound:ws:42", "inbound:from:42:ann@example.com"]);
  });

  it.each([
    ["workspace", "inbound:ws:"],
    ["sender", "inbound:from:"],
  ])("is refused with a 429 when the %s bucket is full", async (_name, prefix) => {
    refuseBucket(prefix);

    const res = await deliver("bakery@inbound.test");

    expect(res.status).toBe(429);
    // Resend redelivers on a non-2xx, so the header tells it when.
    expect(res.headers.get("Retry-After")).toBe("17");
    expect(data.createTicket).not.toHaveBeenCalled();
    expect(data.upsertContact).not.toHaveBeenCalled();
    expect(notifyWorkspace).not.toHaveBeenCalled();
    expect(maybeSendAutoReply).not.toHaveBeenCalled();
  });
});

describe("a reply into an existing thread", () => {
  const replyAddress = "ticket+TKT-9-abc123@inbound.test";

  it("is accepted and counted against the ticket's workspace", async () => {
    const res = await deliver(replyAddress);

    expect(res.status).toBe(200);
    expect(data.addMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(rateLimitDurable).mock.calls[0][0]).toBe("inbound:ws:42");
  });

  it("is refused with a 429 when the workspace bucket is full", async () => {
    refuseBucket("inbound:ws:");

    const res = await deliver(replyAddress);

    expect(res.status).toBe(429);
    expect(data.addMessage).not.toHaveBeenCalled();
    expect(data.backfillOutboundMessageId).not.toHaveBeenCalled();
    expect(notifyWorkspace).not.toHaveBeenCalled();
  });
});

describe("the limiter is not reachable without the secret", () => {
  it("answers 401 before counting anything", async () => {
    process.env.INBOUND_WEBHOOK_SECRET = "a-different-secret";

    const res = await deliver("bakery@inbound.test");

    expect(res.status).toBe(401);
    expect(rateLimitDurable).not.toHaveBeenCalled();
  });
});
