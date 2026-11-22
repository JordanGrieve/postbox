import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bugReports, type BugReport } from "@/db/schema";

/**
 * "Report a bug" (Jordan, 22 Nov 2026): a signed-in person writes what went
 * wrong from the account menu, and it lands in the operator console's Bug
 * reports pane to be read and marked fixed.
 *
 * Shaped like lib/access-requests.ts, the other thing a client sends to the
 * operators: pure field reading here (tested without a database), writes and
 * reads beside it, and the route stays thin.
 */

export const BUG_REPORT_MAX = 2000;
const PAGE_MAX = 300;

/**
 * The path the reporter was on, and nothing else.
 *
 * The query string is dropped: on /search it is what they searched for, and
 * elsewhere it can carry an id or a token that has no business in a report.
 * Anything that is not a same-site path ("https://…", "//host") is refused
 * rather than trusted, because the client sends it.
 */
export function reportedPage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  const path = value.split(/[?#]/)[0];
  return path.slice(0, PAGE_MAX) || null;
}

export type BugReportFields =
  | { ok: true; message: string; page: string | null }
  | { ok: false; error: string };

export function readBugReportFields(body: { message?: unknown; page?: unknown }): BugReportFields {
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return { ok: false, error: "Say what went wrong." };
  if (message.length > BUG_REPORT_MAX) {
    return { ok: false, error: `Keep it under ${BUG_REPORT_MAX} characters.` };
  }
  return { ok: true, message, page: reportedPage(body.page) };
}

export async function createBugReport(input: {
  workspaceId: number | null;
  reporterClerkId: string;
  reporterEmail: string;
  message: string;
  page: string | null;
  userAgent: string | null;
}): Promise<void> {
  await db.insert(bugReports).values({
    workspaceId: input.workspaceId,
    reporterClerkId: input.reporterClerkId,
    reporterEmail: input.reporterEmail.trim().toLowerCase(),
    message: input.message,
    page: input.page,
    userAgent: input.userAgent,
  });
}

/** Open reports, newest first: the one just filed is the one to look at. */
export async function listOpenBugReports(): Promise<BugReport[]> {
  return db
    .select()
    .from(bugReports)
    .where(eq(bugReports.status, "open"))
    .orderBy(desc(bugReports.createdAt), desc(bugReports.id));
}

/** The last few fixed, so a mis-click on "Mark fixed" can be seen and undone. */
export async function listRecentlyFixedBugReports(limit = 10): Promise<BugReport[]> {
  return db
    .select()
    .from(bugReports)
    .where(eq(bugReports.status, "fixed"))
    .orderBy(desc(bugReports.resolvedAt), desc(bugReports.id))
    .limit(limit);
}

export async function countOpenBugReports(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(bugReports)
    .where(eq(bugReports.status, "open"));
  return row?.n ?? 0;
}

export async function getBugReport(id: number): Promise<BugReport | null> {
  const [row] = await db.select().from(bugReports).where(eq(bugReports.id, id)).limit(1);
  return row ?? null;
}

/** Open → fixed, once: a second press on a stale page changes nothing. */
export async function markBugReportFixed(id: number, adminId: number): Promise<BugReport | null> {
  const [row] = await db
    .update(bugReports)
    .set({ status: "fixed", resolvedAt: new Date(), resolvedByAdminId: adminId })
    .where(and(eq(bugReports.id, id), eq(bugReports.status, "open")))
    .returning();
  return row ?? null;
}

/** Fixed → open again, for a report that was closed too soon. */
export async function reopenBugReport(id: number): Promise<void> {
  await db
    .update(bugReports)
    .set({ status: "open", resolvedAt: null, resolvedByAdminId: null })
    .where(and(eq(bugReports.id, id), eq(bugReports.status, "fixed")));
}
