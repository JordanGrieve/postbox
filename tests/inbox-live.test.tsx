// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cleanup, renderHook } from "@testing-library/react";

/**
 * Keeping the inbox live without rebuilding it every 30 seconds.
 *
 * ── WHY ──
 * On 24 Nov 2026 Vercel paused postbox.help: the Hobby plan's 4 hours of
 * server CPU a month were gone. The inbox called router.refresh() every 45
 * seconds and an open conversation every 30, whether or not anything had
 * arrived, and each one re-rendered the whole signed-in page. One tab left
 * open through a working day was about a thousand full renders.
 *
 * Now the page asks GET /api/inbox/live, which answers with one small
 * fingerprint of the workspace's tickets, and re-renders only when that
 * fingerprint has changed. It asks once a minute while the tab is visible and
 * someone has used it in the last ten minutes, and again the moment they come
 * back.
 */

vi.mock("server-only", () => ({}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock() }));

const activeWorkspace = vi.fn();
vi.mock("@/lib/viewer", () => ({ activeWorkspace: () => activeWorkspace() }));

const inboxStamp = vi.fn();
vi.mock("@/app/(dashboard)/queries", () => ({
  inboxStamp: (id: number) => inboxStamp(id),
}));

const { GET } = await import("@/app/api/inbox/live/route");
const { useInboxLive, LIVE_CHECK_MS, IDLE_AFTER_MS, LIVE_URL } = await import(
  "@/lib/use-inbox-live"
);

describe("GET /api/inbox/live", () => {
  beforeEach(() => {
    authMock.mockReset();
    activeWorkspace.mockReset();
    inboxStamp.mockReset();
  });

  it("refuses a visitor who is not signed in, without reading anything", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(activeWorkspace).not.toHaveBeenCalled();
    expect(inboxStamp).not.toHaveBeenCalled();
  });

  it("refuses a signed-in user with no workspace", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    activeWorkspace.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(inboxStamp).not.toHaveBeenCalled();
  });

  it("answers with the fingerprint of the caller's own workspace, never cached", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    activeWorkspace.mockResolvedValue({ id: 29 });
    inboxStamp.mockResolvedValue("12:3:2026-11-24 19:00:00+00");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(inboxStamp).toHaveBeenCalledWith(29);
    expect(await res.json()).toEqual({ stamp: "12:3:2026-11-24 19:00:00+00" });
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
});

describe("useInboxLive", () => {
  let stamps: string[];
  const fetchMock = vi.fn(async () => {
    const stamp = stamps.length > 1 ? stamps.shift() : stamps[0];
    return new Response(JSON.stringify({ stamp }), { status: 200 });
  });

  function setVisibility(state: "visible" | "hidden") {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockReset();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    setVisibility("visible");
  });

  afterEach(() => {
    // Unmount, or a previous test's timer keeps asking during the next one.
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("asks the small endpoint, and re-renders only when something changed", async () => {
    stamps = ["a", "a", "b"];
    renderHook(() => useInboxLive());
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual([LIVE_URL, { cache: "no-store" }]);
    expect(refresh).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(LIVE_CHECK_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refresh).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(LIVE_CHECK_MS);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("asks no more than once a minute", async () => {
    stamps = ["a"];
    renderHook(() => useInboxLive());
    await vi.advanceTimersByTimeAsync(5 * LIVE_CHECK_MS);
    // The first look, then one a minute.
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(LIVE_CHECK_MS).toBeGreaterThanOrEqual(60_000);
  });

  it("stops asking when nobody has used the tab for a while, and asks at once when they come back", async () => {
    stamps = ["a"];
    renderHook(() => useInboxLive());
    await vi.advanceTimersByTimeAsync(IDLE_AFTER_MS);
    const whileActive = fetchMock.mock.calls.length;

    await vi.advanceTimersByTimeAsync(60 * LIVE_CHECK_MS);
    expect(fetchMock.mock.calls.length).toBe(whileActive);

    stamps = ["b"];
    window.dispatchEvent(new Event("pointerdown"));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock.mock.calls.length).toBe(whileActive + 1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("asks nothing while the tab is hidden, and asks at once when it is shown", async () => {
    stamps = ["a"];
    renderHook(() => useInboxLive());
    await vi.advanceTimersByTimeAsync(0);
    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(10 * LIVE_CHECK_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does nothing at all when switched off", async () => {
    stamps = ["a"];
    renderHook(() => useInboxLive(false));
    await vi.advanceTimersByTimeAsync(5 * LIVE_CHECK_MS);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the mail screens", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("use the fingerprint check, not a timed full refresh", () => {
    for (const file of ["components/mail/MessageList.tsx", "components/mail/Thread.tsx"]) {
      const src = read(file);
      expect(src, file).toContain("useInboxLive(");
      expect(src, file).not.toContain("useVisibleRefresh");
    }
    expect(existsSync(join(process.cwd(), "lib/use-visible-refresh.ts"))).toBe(false);
  });
});
