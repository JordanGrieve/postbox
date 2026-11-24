import { auth } from "@clerk/nextjs/server";
import { json } from "@/lib/http";
import { activeWorkspace } from "@/lib/viewer";
import { inboxStamp } from "@/app/(dashboard)/queries";

/**
 * GET /api/inbox/live  (authed)
 *
 * "Has anything changed?" for an open inbox or conversation: one short
 * fingerprint of the caller's own workspace (inboxStamp). The page polls this
 * and re-renders only when the answer moves (lib/use-inbox-live.ts).
 *
 * It replaced a router.refresh() every 30 to 45 seconds, which re-rendered
 * the whole signed-in page whether or not mail had arrived, and used up
 * Vercel's CPU allowance: postbox.help was paused on 24 Nov 2026.
 *
 * The workspace comes from the session (activeWorkspace), never from the
 * request, so a caller can only ever learn about their own.
 */
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await activeWorkspace();
  if (!workspace) return json({ error: "No workspace" }, { status: 401 });

  return json(
    { stamp: await inboxStamp(workspace.id) },
    { headers: { "cache-control": "no-store" } },
  );
}
