import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));

const { fetchSentMessageId } = await import("../lib/sent-message-id");

/**
 * Our own Message-ID, as the customer's mail client saw it.
 *
 * SES overwrites any Message-ID we set, so until a customer replied through
 * the per-ticket address we never knew ours, and a reply that came back to
 * replies@ — referencing only our message — matched nothing (journey retest,
 * 22 Nov 2026: "unrouted reply: 1 referenced id(s)"). Resend's GET
 * /emails/{id} returns it as `message_id`; this reads it.
 */

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("fetchSentMessageId", () => {
  it("returns the provider's Message-ID, bracketed", async () => {
    const fetchFn = fakeFetch(200, { id: "re_1", message_id: "<0102abc@eu-west-1.amazonses.com>" });
    expect(await fetchSentMessageId("re_1", { apiKey: "re_test", fetchFn })).toBe(
      "<0102abc@eu-west-1.amazonses.com>",
    );
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails/re_1");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
  });

  it("adds the angle brackets when the provider leaves them off", async () => {
    const fetchFn = fakeFetch(200, { message_id: "0102abc@eu-west-1.amazonses.com" });
    expect(await fetchSentMessageId("re_1", { apiKey: "re_test", fetchFn })).toBe(
      "<0102abc@eu-west-1.amazonses.com>",
    );
  });

  it("returns null, never throws, when the lookup fails or has no id", async () => {
    expect(await fetchSentMessageId("re_1", { apiKey: "re_test", fetchFn: fakeFetch(404, {}) })).toBeNull();
    expect(await fetchSentMessageId("re_1", { apiKey: "re_test", fetchFn: fakeFetch(200, {}) })).toBeNull();
    const boom = vi.fn(async () => {
      throw new Error("network");
    });
    expect(await fetchSentMessageId("re_1", { apiKey: "re_test", fetchFn: boom })).toBeNull();
  });

  it("does not call out at all without a key", async () => {
    const fetchFn = fakeFetch(200, { message_id: "<x@y>" });
    expect(await fetchSentMessageId("re_1", { apiKey: undefined, fetchFn })).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
