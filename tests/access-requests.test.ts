import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccessRequest, Admin } from "@/db/schema";
import type { Viewer } from "@/lib/viewer";

/**
 * Requests for access (21 Nov 2026). Somebody signed in with no workspace
 * presses "Send request" on /no-access; an operator approves or declines it in
 * the console's Requests pane.
 *
 * What has to hold:
 *  - only a signed-in non-operator with no workspace and a VERIFIED email can
 *    ask, and the request carries that email, not one from the form;
 *  - approving creates the workspace on the requester's OWN Clerk id, so they
 *    are in on their next page load with nothing to claim;
 *  - the audit row is written before anything changes, as everywhere else in
 *    the console, and a failed write stops the action;
 *  - a request is acted on once: a second approval cannot make a second
 *    workspace;
 *  - if creating the workspace fails, the request goes back to pending.
 */

const calls: string[] = [];

class Redirect extends Error {
  constructor(public to: string) {
    super(`redirect ${to}`);
  }
}

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: authMock, currentUser: vi.fn() }));

const { viewerMock, adminRowMock } = vi.hoisted(() => ({
  viewerMock: vi.fn(),
  adminRowMock: vi.fn(),
}));
vi.mock("@/lib/viewer", () => ({
  resolveViewer: viewerMock,
  requireAdminRow: adminRowMock,
  requireAdmin: vi.fn(),
  ADMIN_WS_COOKIE: "pb_admin_ws",
}));

const { recordMock } = vi.hoisted(() => ({ recordMock: vi.fn() }));
vi.mock("@/lib/admin-audit", () => ({ recordAdminAction: recordMock }));

const store = vi.hoisted(() => ({
  createAccessRequest: vi.fn(),
  getAccessRequest: vi.fn(),
  decideAccessRequest: vi.fn(),
  reopenAccessRequest: vi.fn(),
  linkAccessRequestWorkspace: vi.fn(),
}));
vi.mock("@/lib/access-requests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/access-requests")>()),
  ...store,
}));

const { provisionMock } = vi.hoisted(() => ({ provisionMock: vi.fn() }));
vi.mock("@/lib/workspace", () => ({
  provisionWorkspace: provisionMock,
  generateApiKey: vi.fn(),
  ownerClerkId: vi.fn(),
}));

const { agentByEmailMock } = vi.hoisted(() => ({ agentByEmailMock: vi.fn() }));
vi.mock("@/lib/data", () => ({
  getAgentByEmail: agentByEmailMock,
  getWorkspaceById: vi.fn(),
  deleteWorkspace: vi.fn(),
  getPendingAgent: vi.fn(),
  rotateWorkspaceApiKey: vi.fn(),
  setSignupConfirmation: vi.fn(),
}));

const { inviteMock, alertMock, listAdminsMock } = vi.hoisted(() => ({
  inviteMock: vi.fn(),
  alertMock: vi.fn(),
  listAdminsMock: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendInviteEmail: inviteMock,
  sendAccessRequestAlert: alertMock,
}));
vi.mock("@/lib/admin", () => ({
  addAdmin: vi.fn(),
  findAdminByEmail: vi.fn(),
  getAdminById: vi.fn(),
  removeAdmin: vi.fn(),
  listAdmins: listAdminsMock,
}));
vi.mock("@/lib/impersonation", () => ({
  ADMIN_IMP_COOKIE: "pb_admin_imp",
  endImpersonation: vi.fn(),
  endOpenSessionsForAdmin: vi.fn(),
  endOpenSessionsForWorkspace: vi.fn(),
  startImpersonation: vi.fn(),
}));

const { readAccessRequestFields, MAX_BUSINESS_NAME, MAX_REQUEST_MESSAGE } =
  await import("@/lib/access-requests");
const { requestAccessAction } = await import("@/app/no-access/actions");
const { approveAccessRequestAction, declineAccessRequestAction } = await import(
  "@/app/(admin)/admin/actions"
);

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

/** Run an action and return where it redirected to. */
async function landing(run: Promise<void>): Promise<string> {
  try {
    await run;
  } catch (err) {
    if (err instanceof Redirect) return err.to;
    throw err;
  }
  throw new Error("the action returned without redirecting");
}

const admin = {
  id: 1,
  email: "operator@postbox.help",
  clerkUserId: "user_op",
  createdAt: new Date("2026-07-08T00:00:00Z"),
} satisfies Partial<Admin> as Admin;

const pending = {
  id: 7,
  clerkUserId: "user_stranger",
  email: "owner@opendoorbakery.co.uk",
  businessName: "Open Door Bakery",
  message: null,
  status: "pending",
  createdAt: new Date("2026-11-21T10:00:00Z"),
  decidedAt: null,
  decidedByAdminId: null,
  workspaceId: null,
} satisfies AccessRequest;

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  adminRowMock.mockResolvedValue(admin);
  authMock.mockResolvedValue({ userId: "user_stranger" });
  viewerMock.mockResolvedValue({
    isAdmin: false,
    email: "owner@opendoorbakery.co.uk",
    workspace: null,
  } satisfies Viewer);
  store.getAccessRequest.mockResolvedValue(pending);
  store.createAccessRequest.mockResolvedValue(true);
  store.decideAccessRequest.mockImplementation(async () => {
    calls.push("decide");
    return { ...pending, status: "approved" } satisfies AccessRequest;
  });
  recordMock.mockImplementation(async () => {
    calls.push("audit");
  });
  provisionMock.mockImplementation(async () => {
    calls.push("provision");
    return { workspace: { id: 42 }, agent: { id: 1 } };
  });
  agentByEmailMock.mockResolvedValue(null);
  inviteMock.mockResolvedValue({ sent: true });
  alertMock.mockResolvedValue({ sent: true });
  listAdminsMock.mockResolvedValue([admin]);
});

describe("readAccessRequestFields", () => {
  it("takes a business name and an optional note, trimmed", () => {
    expect(readAccessRequestFields(form({ businessName: "  Bakery ", message: "  " }))).toEqual({
      ok: true,
      businessName: "Bakery",
      message: null,
    });
    expect(readAccessRequestFields(form({ businessName: "Bakery", message: "Hi" }))).toEqual({
      ok: true,
      businessName: "Bakery",
      message: "Hi",
    });
  });

  it("refuses a missing name and over-long input rather than cutting it", () => {
    expect(readAccessRequestFields(form({ businessName: "  " })).ok).toBe(false);
    expect(
      readAccessRequestFields(form({ businessName: "x".repeat(MAX_BUSINESS_NAME + 1) })).ok,
    ).toBe(false);
    expect(
      readAccessRequestFields(
        form({ businessName: "Bakery", message: "x".repeat(MAX_REQUEST_MESSAGE + 1) }),
      ).ok,
    ).toBe(false);
  });
});

describe("Send request", () => {
  it("files the request under the signed-in user and their verified email", async () => {
    const to = await landing(
      requestAccessAction(
        form({ businessName: "Open Door Bakery", message: "Ten a day", email: "someone@else.com" }),
      ),
    );
    expect(to).toBe("/no-access");
    expect(store.createAccessRequest).toHaveBeenCalledWith({
      clerkUserId: "user_stranger",
      email: "owner@opendoorbakery.co.uk",
      businessName: "Open Door Bakery",
      message: "Ten a day",
    });
  });

  it("refuses an unverified email", async () => {
    viewerMock.mockResolvedValue({ isAdmin: false, email: "", workspace: null } satisfies Viewer);
    const to = await landing(requestAccessAction(form({ businessName: "Bakery" })));
    expect(to).toContain("/no-access?error=");
    expect(store.createAccessRequest).not.toHaveBeenCalled();
  });

  it("sends somebody who already has access where they belong", async () => {
    viewerMock.mockResolvedValue({
      isAdmin: true,
      email: "operator@postbox.help",
      workspace: null,
      impersonation: null,
    } satisfies Viewer);
    expect(await landing(requestAccessAction(form({ businessName: "Bakery" })))).toBe("/admin");
    expect(store.createAccessRequest).not.toHaveBeenCalled();
  });

  it("emails the operators about a new request, with the requester as Reply-To", async () => {
    await landing(requestAccessAction(form({ businessName: "Open Door Bakery", message: "Hi" })));
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(alertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["operator@postbox.help"],
        requesterEmail: "owner@opendoorbakery.co.uk",
        businessName: "Open Door Bakery",
        message: "Hi",
      }),
    );
    expect(alertMock.mock.calls[0]![0].consoleUrl).toMatch(/\/admin\?section=requests$/);
  });

  it("does not email again for a request that was already waiting", async () => {
    store.createAccessRequest.mockResolvedValue(false);
    await landing(requestAccessAction(form({ businessName: "Open Door Bakery" })));
    expect(alertMock).not.toHaveBeenCalled();
  });

  it("still files the request when the alert cannot be sent", async () => {
    alertMock.mockRejectedValue(new Error("provider down"));
    const to = await landing(requestAccessAction(form({ businessName: "Open Door Bakery" })));
    expect(to).toBe("/no-access");
    expect(store.createAccessRequest).toHaveBeenCalled();
  });

  it("refuses a missing business name", async () => {
    const to = await landing(requestAccessAction(form({ businessName: "" })));
    expect(to).toContain("/no-access?error=");
    expect(store.createAccessRequest).not.toHaveBeenCalled();
  });
});

describe("Approve", () => {
  it("logs, claims, then creates the workspace on the requester's own login", async () => {
    const to = await landing(
      approveAccessRequestAction(form({ requestId: "7", name: "Open Door Bakery Ltd" })),
    );
    expect(calls).toEqual(["audit", "decide", "provision"]);
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "workspace_created", actorAdminId: 1 }),
    );
    expect(provisionMock).toHaveBeenCalledWith({
      name: "Open Door Bakery Ltd",
      ownerEmail: "owner@opendoorbakery.co.uk",
      clerkUserId: "user_stranger",
    });
    expect(store.linkAccessRequestWorkspace).toHaveBeenCalledWith(7, 42);
    expect(inviteMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@opendoorbakery.co.uk", approved: true }),
    );
    expect(to).toContain("approved=Open%20Door%20Bakery%20Ltd");
    expect(to).toContain("emailed=1");
  });

  it("creates nothing when the log cannot be written", async () => {
    recordMock.mockRejectedValue(new Error("chain write failed"));
    await expect(
      approveAccessRequestAction(form({ requestId: "7", name: "Bakery" })),
    ).rejects.toThrow("chain write failed");
    expect(store.decideAccessRequest).not.toHaveBeenCalled();
    expect(provisionMock).not.toHaveBeenCalled();
  });

  it("creates no second workspace for a request another click already took", async () => {
    store.decideAccessRequest.mockResolvedValue(null);
    const to = await landing(approveAccessRequestAction(form({ requestId: "7", name: "Bakery" })));
    expect(to).toContain("error=");
    expect(provisionMock).not.toHaveBeenCalled();
  });

  it("puts the request back to pending if the workspace could not be made", async () => {
    provisionMock.mockRejectedValue(new Error("insert failed"));
    await expect(
      approveAccessRequestAction(form({ requestId: "7", name: "Bakery" })),
    ).rejects.toThrow("insert failed");
    expect(store.reopenAccessRequest).toHaveBeenCalledWith(7);
  });

  it("refuses an email that already has a workspace", async () => {
    agentByEmailMock.mockResolvedValue({ id: 3 });
    const to = await landing(approveAccessRequestAction(form({ requestId: "7", name: "Bakery" })));
    expect(to).toContain("already%20linked");
    expect(recordMock).not.toHaveBeenCalled();
    expect(provisionMock).not.toHaveBeenCalled();
  });
});

describe("Decline", () => {
  it("logs before marking it declined, and creates nothing", async () => {
    const to = await landing(declineAccessRequestAction(form({ requestId: "7" })));
    expect(calls).toEqual(["audit", "decide"]);
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "access_request_declined", targetLabel: pending.email }),
    );
    expect(store.decideAccessRequest).toHaveBeenCalledWith(7, "declined", 1);
    expect(provisionMock).not.toHaveBeenCalled();
    expect(inviteMock).not.toHaveBeenCalled();
    expect(to).toContain("declined=");
  });

  it("does nothing to a request that is no longer pending", async () => {
    store.getAccessRequest.mockResolvedValue({ ...pending, status: "approved" });
    const to = await landing(declineAccessRequestAction(form({ requestId: "7" })));
    expect(to).toContain("already%20been%20dealt%20with");
    expect(recordMock).not.toHaveBeenCalled();
  });
});
