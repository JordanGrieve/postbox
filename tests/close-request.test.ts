import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * "Close this workspace" asks; it never deletes (Jordan, 20 Nov 2026).
 *
 * The request becomes a ticket in Postbox's own inbox — the workspace behind
 * POSTBOX_CONTACT_KEY — with the client's address on it to reply to. These
 * pin that it lands there and only there, that it names the caller's OWN
 * workspace (never one from the body), and that nothing deletes anything.
 */

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  resolveViewer: vi.fn(),
  rateLimitDurable: vi.fn(),
  resolveIngestKey: vi.fn(),
  upsertContact: vi.fn(),
  createTicket: vi.fn(),
  notifyWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  config: { POSTBOX_CONTACT_KEY: "cli_postbox_own" as string | undefined },
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: h.auth }));
vi.mock("@/lib/viewer", () => ({ resolveViewer: h.resolveViewer }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitDurable: h.rateLimitDurable }));
vi.mock("@/lib/forms", () => ({ resolveIngestKey: h.resolveIngestKey }));
vi.mock("@/lib/data", () => ({
  upsertContact: h.upsertContact,
  createTicket: h.createTicket,
  deleteWorkspace: h.deleteWorkspace,
}));
vi.mock("@/lib/notify", () => ({ notifyWorkspace: h.notifyWorkspace }));
vi.mock("@/lib/config", () => ({
  get POSTBOX_CONTACT_KEY() {
    return h.config.POSTBOX_CONTACT_KEY;
  },
}));

import { POST } from "../app/api/workspace/close-request/route";
import { closureRequestTicket } from "../lib/close-request";

const CLIENT = { id: 42, name: "Open Door Bakery" };
const POSTBOX = { id: 1, name: "Postbox" };

function post(body: unknown = {}) {
  return POST(
    new Request("http://localhost/api/workspace/close-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.config.POSTBOX_CONTACT_KEY = "cli_postbox_own";
  h.auth.mockResolvedValue({ userId: "user_1" });
  h.resolveViewer.mockResolvedValue({
    isAdmin: false,
    email: "emma@opendoorbakery.co.uk",
    workspace: CLIENT,
    agentEmail: "emma@opendoorbakery.co.uk",
  });
  h.rateLimitDurable.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
  h.resolveIngestKey.mockResolvedValue({ workspace: POSTBOX, form: null });
  h.createTicket.mockResolvedValue({ id: 900 });
});

describe("closureRequestTicket", () => {
  it("names the workspace, who asked and why, and says nothing was deleted", () => {
    const t = closureRequestTicket({
      workspace: CLIENT,
      requesterEmail: "emma@opendoorbakery.co.uk",
      reason: "  Closing the shop.  ",
    });
    expect(t.subject).toBe("Close workspace: Open Door Bakery (#42)");
    expect(t.body).toContain("Workspace: Open Door Bakery (#42)");
    expect(t.body).toContain("Asked by: emma@opendoorbakery.co.uk");
    expect(t.body).toContain("Their reason: Closing the shop.");
    expect(t.body).toContain("Nothing has been deleted.");
  });

  it("says so when there is no reason", () => {
    expect(
      closureRequestTicket({ workspace: CLIENT, requesterEmail: "a@b.co", reason: " " }).body,
    ).toContain("They didn’t give a reason.");
  });
});

describe("POST /api/workspace/close-request", () => {
  it("files a ticket in Postbox's own inbox, about the caller's own workspace", async () => {
    // A workspace id in the body must change nothing.
    const res = await post({ reason: "Closing the shop", workspaceId: 7 });
    expect(res.status).toBe(200);

    expect(h.resolveIngestKey).toHaveBeenCalledWith("cli_postbox_own");
    expect(h.createTicket).toHaveBeenCalledTimes(1);
    const ticket = h.createTicket.mock.calls[0]![0];
    expect(ticket.workspaceId).toBe(POSTBOX.id);
    expect(ticket.customerEmail).toBe("emma@opendoorbakery.co.uk");
    expect(ticket.subject).toBe("Close workspace: Open Door Bakery (#42)");
    expect(ticket.body).toContain("Their reason: Closing the shop");
    expect(h.notifyWorkspace).toHaveBeenCalledTimes(1);
    expect(h.rateLimitDurable).toHaveBeenCalledWith("close-request:42", expect.any(Object));
  });

  it("never deletes anything", async () => {
    await post();
    expect(h.deleteWorkspace).not.toHaveBeenCalled();
  });

  it("refuses an operator: they close workspaces from the console", async () => {
    h.resolveViewer.mockResolvedValue({
      isAdmin: true,
      email: "jordan@postbox.help",
      workspace: CLIENT,
      impersonation: null,
    });
    const res = await post();
    expect(res.status).toBe(403);
    expect(h.createTicket).not.toHaveBeenCalled();
  });

  it("refuses a signed-out caller", async () => {
    h.auth.mockResolvedValue({ userId: null });
    expect((await post()).status).toBe(401);
    expect(h.createTicket).not.toHaveBeenCalled();
  });

  it("refuses an account with no verified address to reply to", async () => {
    h.resolveViewer.mockResolvedValue({ isAdmin: false, email: "", workspace: CLIENT, agentEmail: "" });
    expect((await post()).status).toBe(400);
    expect(h.createTicket).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    h.rateLimitDurable.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });
    expect((await post()).status).toBe(429);
    expect(h.createTicket).not.toHaveBeenCalled();
  });

  it("says it could not send, rather than pretending, when there is no inbox to send to", async () => {
    h.config.POSTBOX_CONTACT_KEY = undefined;
    const res = await post();
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toMatch(/couldn’t send/);
    expect(h.createTicket).not.toHaveBeenCalled();
  });
});
