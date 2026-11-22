import { auth } from "@clerk/nextjs/server";
import { json } from "@/lib/http";
import { resolveViewer } from "@/lib/viewer";
import { rateLimitDurable } from "@/lib/rate-limit-store";
import { createBugReport, readBugReportFields } from "@/lib/bug-reports";

/**
 * POST /api/bug-reports — "Report a bug" from the account menu.
 *
 * Signed-in only (proxy.ts leaves /api public, so the check is here). Anybody
 * with a session may report, operators included, since they find bugs too;
 * the report records the workspace they were in, or none.
 *
 * Rate limited per person: ten an hour is far more than anybody reports, and
 * a stuck retry loop or a script cannot fill the console.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return json({ error: "Sign in to report a bug." }, { status: 401 });

  const viewer = await resolveViewer();
  if (!viewer.email) {
    return json(
      { error: "Your account has no verified email address for us to reply to." },
      { status: 400 },
    );
  }

  const limit = await rateLimitDurable(`bug-report:${userId}`, { max: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) {
    return json({ error: "Thanks — we’ve had a few from you already. Try again later." }, { status: 429 });
  }

  let body: { message?: unknown; page?: unknown } = {};
  try {
    const parsed: unknown = await req.json();
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    // An unreadable body is an empty report, refused below in words.
  }

  const fields = readBugReportFields(body);
  if (!fields.ok) return json({ error: fields.error }, { status: 400 });

  await createBugReport({
    workspaceId: viewer.workspace?.id ?? null,
    reporterClerkId: userId,
    reporterEmail: viewer.email,
    message: fields.message,
    page: fields.page,
    userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
  });

  return json({ ok: true });
}
