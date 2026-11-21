import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Ticket, Workspace } from "@/db/schema";
import type { RateLimitResult } from "@/lib/rate-limit";

/**
 * Inbound de-duplication is per workspace.
 *
 * It matched a Message-ID across the whole platform, so one email sent to two
 * clients' Postbox addresses (CC'd, or forwarded from two inboxes) was filed
 * for whichever came first and dropped as a "duplicate" for the other; and
 * the route stopped at the first workspace address it found anyway
 * (AUDIT-REPORT.md, fixed 21 Nov 2026). Now every addressed workspace gets
 * its own ticket, and a retry files only what is still missing.
 *
 * Behavioural, like tests/inbound-rate-limit.test.ts: a real Request in, and
 * assertions on what the route did.
 */

const SECRET = "inbound-dedupe-secret";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
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
  messageIdExists: vi.fn(),
}));

const { POST } = await import("@/app/api/inbound/route");
const { rateLimitDurable } = await import("@/lib/rate-limit-store");
const data = await import("@/lib/data");

const bakery = { id: 42, name: "Bakery", inboundEmail: "bakery@inbound.test" } satisfies Partial<Workspace> as Workspace;
const florist = { id: 43, name: "Florist", inboundEmail: "florist@inbound.test" } satisfies Partial<Workspace> as Workspace;

const allowed = { ok: true, remaining: 5, limit: 60, retryAfterSeconds: 0 } satisfies RateLimitResult;

function deliver(to: string[]) {
  return POST(
    new Request("http://postbox.test/api/inbound", {
      method: "POST",
      headers: { "x-webhook-secret": SECRET },
      body: JSON.stringify({
        from: "Ann <ann@example.com>",
        to,
        subject: "Two shops, one question",
        text: "Hello both",
        message_id: "<cc@example.com>",
      }),
    }),
  );
}

/** Which workspaces already hold <cc@example.com>. */
function alreadyIn(...ids: number[]) {
  vi.mocked(data.messageIdExists).mockImplementation(async (_id, ws) => ids.includes(ws));
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.INBOUND_WEBHOOK_SECRET = SECRET;
  delete process.env.RESEND_WEBHOOK_SIGNING_SECRET;
  // Only these two addresses are ever delivered to below.
  vi.mocked(data.getWorkspaceByInboundEmail).mockImplementation(async (addr) =>
    addr === bakery.inboundEmail ? bakery : florist,
  );
  vi.mocked(data.createTicket).mockImplementation(
    async (t) => ({ id: t.workspaceId * 10, workspaceId: t.workspaceId }) satisfies Partial<Ticket> as Ticket,
  );
  vi.mocked(rateLimitDurable).mockResolvedValue(allowed);
});

const ticketWorkspaces = () => vi.mocked(data.createTicket).mock.calls.map((c) => c[0].workspaceId);

describe("one email to two clients", () => {
  it("opens a ticket in each workspace", async () => {
    alreadyIn();
    const res = await deliver([bakery.inboundEmail, florist.inboundEmail]);
    expect(res.status).toBe(201);
    expect(ticketWorkspaces()).toEqual([42, 43]);
  });

  it("checks for the Message-ID in each workspace, not across the platform", async () => {
    alreadyIn();
    await deliver([bakery.inboundEmail, florist.inboundEmail]);
    expect(vi.mocked(data.messageIdExists).mock.calls).toEqual([
      ["<cc@example.com>", 42],
      ["<cc@example.com>", 43],
    ]);
  });

  it("files only the missing copy on a retry after a partial run", async () => {
    alreadyIn(42);
    const res = await deliver([bakery.inboundEmail, florist.inboundEmail]);
    expect(res.status).toBe(201);
    expect(ticketWorkspaces()).toEqual([43]);
  });

  it("is a duplicate, writing nothing, when every workspace already has it", async () => {
    alreadyIn(42, 43);
    const res = await deliver([bakery.inboundEmail, florist.inboundEmail]);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ duplicate: true });
    expect(data.createTicket).not.toHaveBeenCalled();
  });
});

describe("messageIdExists", () => {
  it("is scoped by the ticket's workspace through the join", () => {
    const src = readFileSync(join(__dirname, "..", "lib", "data.ts"), "utf8");
    const at = src.indexOf("export async function messageIdExists(");
    expect(at).toBeGreaterThan(-1);
    const body = src.slice(at, src.indexOf("\n}\n", at));
    expect(body).toMatch(/\.innerJoin\(tickets, eq\(ticketMessages\.ticketId, tickets\.id\)\)/);
    expect(body).toMatch(/eq\(tickets\.workspaceId, workspaceId\)/);
  });
});
