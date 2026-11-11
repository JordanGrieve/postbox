import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Campaign, Workspace } from "@/db/schema";
import type { RateLimitResult } from "@/lib/rate-limit";
import type { Viewer } from "@/lib/viewer";
import { describeBlock, entitlement, type WorkspaceBilling } from "@/lib/trial";

/**
 * POST /api/campaigns/:id/test-send performs a real send and never read the
 * billing entitlement (BACKEND-REVIEW S4, 11 Sep 2026): an expired trial or a
 * lapsed card could still make mail leave, one message per call.
 *
 * The entitlements below are produced by the real entitlement() from real
 * billing rows, not written out by hand, so they cannot be a state the product
 * never produces.
 */

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/config", () => ({ APP_URL: "https://postbox.test" }));
vi.mock("@/lib/viewer", () => ({ resolveViewer: vi.fn() }));
vi.mock("@/lib/billing-query", () => ({ getWorkspaceEntitlement: vi.fn() }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitDurable: vi.fn() }));
vi.mock("@/lib/campaign-send", () => ({ getCampaign: vi.fn() }));
vi.mock("@/lib/email-quota-store", () => ({ recordTransactionalSend: vi.fn() }));
vi.mock("@/lib/deliver", () => ({
  createCampaignDeliverer: vi.fn(),
  deliveryModeFromEnv: vi.fn(() => "resend"),
  isLiveDeliveryMode: vi.fn(() => true),
}));

const { POST } = await import("@/app/api/campaigns/[id]/test-send/route");
const { auth } = await import("@clerk/nextjs/server");
const { resolveViewer } = await import("@/lib/viewer");
const { getWorkspaceEntitlement } = await import("@/lib/billing-query");
const { rateLimitDurable } = await import("@/lib/rate-limit-store");
const { getCampaign } = await import("@/lib/campaign-send");
const { createCampaignDeliverer } = await import("@/lib/deliver");

type ClerkAuth = Awaited<ReturnType<typeof auth>>;

const NOW = new Date("2026-11-11T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const trialStartedToday = {
  plan: "trial",
  trialStartedAt: NOW,
  stripeSubscriptionId: null,
  currentPeriodEnd: null,
} satisfies WorkspaceBilling;

const trialStartedLongAgo = {
  ...trialStartedToday,
  trialStartedAt: new Date(NOW.getTime() - 90 * DAY),
} satisfies WorkspaceBilling;

const noUsage = { tickets: 0, subscribers: 0 };
const active = entitlement(trialStartedToday, noUsage, NOW);
const expired = entitlement(trialStartedLongAgo, noUsage, NOW);

const workspace = {
  id: 42,
  name: "Bakery",
  legalName: "Open Door Bakery Ltd",
  postalAddress: "1 High Street, Edinburgh",
  brandAccentHex: null,
  brandSignOff: null,
} satisfies Partial<Workspace> as Workspace;

const campaign = {
  id: 5,
  subject: "November news",
  preheader: null,
  templateKey: "plain",
  body: "Hello from the bakery.",
  heroImageUrl: null,
  heroImageAlt: null,
  products: null,
} satisfies Partial<Campaign> as Campaign;

const viewer = {
  isAdmin: false,
  email: "owner@bakery.example",
  workspace,
  agentEmail: "owner@bakery.example",
} satisfies Viewer;

const allowed = {
  ok: true,
  remaining: 5,
  limit: 6,
  retryAfterSeconds: 0,
} satisfies RateLimitResult;

const deliver = vi.fn(async () => ({ id: "msg_1" }));

function send() {
  return POST(
    new Request("http://postbox.test/api/campaigns/5/test-send", { method: "POST" }),
    { params: Promise.resolve({ id: "5" }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CAMPAIGN_FROM_ADDRESS = "news@mail.postbox.test";
  vi.mocked(auth).mockResolvedValue(
    { userId: "user_1" } satisfies Partial<ClerkAuth> as ClerkAuth,
  );
  vi.mocked(resolveViewer).mockResolvedValue(viewer);
  vi.mocked(rateLimitDurable).mockResolvedValue(allowed);
  vi.mocked(getCampaign).mockResolvedValue(campaign);
  vi.mocked(createCampaignDeliverer).mockReturnValue(deliver);
});

describe("the fixtures are the states they claim to be", () => {
  it("a trial started today may send; one started 90 days ago may not", () => {
    expect(active.maySendCampaigns).toBe(true);
    expect(expired.maySendCampaigns).toBe(false);
    expect(expired.blockedReason).toBe("trial_expired");
  });
});

describe("POST /api/campaigns/:id/test-send", () => {
  it("sends when the workspace is entitled to send", async () => {
    vi.mocked(getWorkspaceEntitlement).mockResolvedValue(active);

    const res = await send();

    expect(res.status).toBe(200);
    expect(getWorkspaceEntitlement).toHaveBeenCalledWith(42);
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("refuses with a 402 and the account holder's wording when it is not", async () => {
    vi.mocked(getWorkspaceEntitlement).mockResolvedValue(expired);

    const res = await send();
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(402);
    expect(body.error).toBe(describeBlock("trial_expired"));
    expect(deliver).not.toHaveBeenCalled();
    expect(createCampaignDeliverer).not.toHaveBeenCalled();
    // Refused before the limiter, so a blocked account spends none of its
    // six test sends finding out.
    expect(rateLimitDurable).not.toHaveBeenCalled();
  });

  it("does not block when the entitlement could not be read", async () => {
    // getWorkspaceEntitlement documents null as "do not block".
    vi.mocked(getWorkspaceEntitlement).mockResolvedValue(null);

    const res = await send();

    expect(res.status).toBe(200);
    expect(deliver).toHaveBeenCalledTimes(1);
  });
});
