import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent, Workspace } from "@/db/schema";
import type { ClerkEmailCarrier } from "@/lib/clerk-email";

/**
 * An email address is a credential here: it claims a workspace invite and it
 * elevates a first sign-in to operator. BACKEND-REVIEW S1 (11 Sep 2026) found
 * that nothing checked the address was verified, and that the fallback took
 * any address on the account. This pins both halves: the pure rule, and that
 * resolveWorkspace acts on it by never reaching the invite lookup.
 */

const db = vi.hoisted(() => {
  const selectResults: unknown[][] = [];
  const limit = vi.fn(async () => selectResults.shift() ?? []);
  const select = vi.fn(() => ({ from: () => ({ where: () => ({ limit }) }) }));
  const returning = vi.fn(async (): Promise<unknown[]> => []);
  const set = vi.fn(() => ({ where: () => ({ returning }) }));
  const update = vi.fn(() => ({ set }));
  return { selectResults, select, limit, update, set, returning };
});

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: { select: db.select, update: db.update } }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), currentUser: vi.fn() }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitDurable: vi.fn() }));
vi.mock("@/lib/labels", () => ({ seedStarterLabels: vi.fn() }));

const { auth, currentUser } = await import("@clerk/nextjs/server");
const { verifiedPrimaryEmail } = await import("@/lib/clerk-email");
const { resolveWorkspace } = await import("@/lib/workspace");

type ClerkUser = Awaited<ReturnType<typeof currentUser>>;
type ClerkAuth = Awaited<ReturnType<typeof auth>>;

function carrier(status: string | null, address = "Owner@Bakery.example") {
  return {
    primaryEmailAddress: {
      emailAddress: address,
      verification: status === null ? null : { status },
    },
  } satisfies ClerkEmailCarrier;
}

describe("verifiedPrimaryEmail", () => {
  it("returns the primary address, lowercased, when it is verified", () => {
    expect(verifiedPrimaryEmail(carrier("verified"))).toBe("owner@bakery.example");
  });

  it.each(["unverified", "failed", "expired", "transferable"])(
    "returns null when the status is %s",
    (status) => {
      expect(verifiedPrimaryEmail(carrier(status))).toBeNull();
    },
  );

  it("returns null when there is no verification record at all", () => {
    expect(verifiedPrimaryEmail(carrier(null))).toBeNull();
  });

  it("returns null with no primary address, whatever else is on the account", () => {
    // The old fallback read the first entry of this list. It is not part of
    // the carrier type, which is the point: the rule cannot see it.
    const user = {
      primaryEmailAddress: null,
      emailAddresses: [
        { emailAddress: "attacker@example.com", verification: { status: "verified" } },
      ],
    };
    expect(verifiedPrimaryEmail(user)).toBeNull();
  });

  it("returns null for no user and for a blank address", () => {
    expect(verifiedPrimaryEmail(null)).toBeNull();
    expect(verifiedPrimaryEmail(undefined)).toBeNull();
    expect(verifiedPrimaryEmail(carrier("verified", "   "))).toBeNull();
  });
});

describe("resolveWorkspace and an invite waiting for this address", () => {
  const invited = { id: 7, workspaceId: 3 } satisfies Partial<Agent> as Agent;
  const claimed = {
    id: 7,
    workspaceId: 3,
    clerkUserId: "user_new",
    email: "owner@bakery.example",
  } satisfies Partial<Agent> as Agent;
  const workspace = { id: 3, name: "Bakery" } satisfies Partial<Workspace> as Workspace;

  beforeEach(() => {
    vi.clearAllMocks();
    db.selectResults.length = 0;
    vi.mocked(auth).mockResolvedValue(
      { userId: "user_new" } satisfies Partial<ClerkAuth> as ClerkAuth,
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("claims it for a verified primary address", async () => {
    // No membership yet, then the invite, then the workspace it belongs to.
    db.selectResults.push([], [invited], [workspace]);
    db.returning.mockResolvedValueOnce([claimed]);
    vi.mocked(currentUser).mockResolvedValue(
      carrier("verified") satisfies ClerkEmailCarrier as ClerkUser,
    );

    const resolved = await resolveWorkspace();

    expect(db.set).toHaveBeenCalledWith({
      clerkUserId: "user_new",
      email: "owner@bakery.example",
    });
    expect(resolved?.workspace.id).toBe(3);
  });

  it("does not claim it for an unverified one, and never looks", async () => {
    // The same invite is waiting. If the lookup ran it would be found.
    db.selectResults.push([], [invited], [workspace]);
    db.returning.mockResolvedValueOnce([claimed]);
    vi.mocked(currentUser).mockResolvedValue(
      carrier("unverified") satisfies ClerkEmailCarrier as ClerkUser,
    );

    const resolved = await resolveWorkspace();

    expect(resolved).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
    // One select: the membership check by Clerk id. Not the invite lookup.
    expect(db.select).toHaveBeenCalledTimes(1);
  });
});
