import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keep an open inbox or conversation up to date, cheaply.
 *
 * Asks GET /api/inbox/live for a short fingerprint of the workspace's tickets
 * and calls router.refresh() only when it has changed since the last answer.
 *
 * It replaced useVisibleRefresh, which called router.refresh() every 30 to 45
 * seconds regardless: a full server render of the signed-in page each time,
 * about a thousand a day for one tab left open. That used up Vercel's 4 hours
 * of CPU a month and postbox.help was paused on 24 Nov 2026.
 *
 * When it asks:
 *  - once on mount, to learn the starting fingerprint (no refresh);
 *  - every LIVE_CHECK_MS while the tab is visible AND someone has touched it
 *    in the last IDLE_AFTER_MS (a forgotten tab stops costing anything);
 *  - at once when the tab is shown again, or used again after going idle,
 *    so coming back to it is never stale.
 *
 * `enabled` lets a caller stand down without breaking the rules of hooks: the
 * inbox list skips its own check while a thread is open, because the thread
 * already refreshes the whole route.
 *
 * tests/inbox-live.test.tsx pins each of these.
 */

export const LIVE_URL = "/api/inbox/live";
export const LIVE_CHECK_MS = 60_000;
export const IDLE_AFTER_MS = 10 * 60_000;

const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"];

export function useInboxLive(enabled = true): void {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    let seen: string | null = null;
    let lastActive = Date.now();
    let asking = false;
    let stopped = false;

    const visible = () => document.visibilityState === "visible";
    const idle = () => Date.now() - lastActive >= IDLE_AFTER_MS;

    async function check() {
      if (asking || stopped) return;
      asking = true;
      try {
        const res = await fetch(LIVE_URL, { cache: "no-store" });
        if (!res.ok) return;
        const body: { stamp?: unknown } = await res.json();
        if (typeof body.stamp !== "string") return;
        if (seen !== null && body.stamp !== seen && !stopped) router.refresh();
        seen = body.stamp;
      } catch {
        // Offline or a deploy in progress: the next tick asks again.
      } finally {
        asking = false;
      }
    }

    const tick = () => {
      if (visible() && !idle()) void check();
    };

    const onActivity = () => {
      const wasIdle = idle();
      lastActive = Date.now();
      if (wasIdle && visible()) void check();
    };

    const onVisibility = () => {
      if (!visible()) return;
      lastActive = Date.now();
      void check();
    };

    void check();
    const timer = setInterval(tick, LIVE_CHECK_MS);
    for (const e of ACTIVITY) {
      window.addEventListener(e, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      clearInterval(timer);
      for (const e of ACTIVITY) window.removeEventListener(e, onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, enabled]);
}
