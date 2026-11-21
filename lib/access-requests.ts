import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accessRequests,
  type AccessRequest,
  type AccessRequestStatus,
} from "@/db/schema";
import { isUniqueViolation } from "./pg-errors";

/**
 * Requests for access from people who signed in with no workspace.
 *
 * The requester asks on /no-access; an operator approves or declines in the
 * console's Requests pane. See the table's comment in db/schema.ts for why it
 * is keyed on the Clerk user id.
 */

/** Longest business name accepted; the console's own New account form uses 80. */
export const MAX_BUSINESS_NAME = 80;
/** Longest note accepted from the requester. */
export const MAX_REQUEST_MESSAGE = 1000;

export type AccessRequestFields =
  | { ok: true; businessName: string; message: string | null }
  | { ok: false; error: string };

/**
 * Read and check the request form. Pure, so it can be tested without a
 * request: the action and the tests share it.
 *
 * Over-long input is refused rather than cut, because a note cut off at a
 * limit the writer never saw would arrive with its end missing and nothing
 * saying so.
 */
export function readAccessRequestFields(form: FormData): AccessRequestFields {
  const businessName = String(form.get("businessName") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();

  if (!businessName) {
    return { ok: false, error: "Add your business name." };
  }
  if (businessName.length > MAX_BUSINESS_NAME) {
    return {
      ok: false,
      error: `Keep the business name under ${MAX_BUSINESS_NAME} characters.`,
    };
  }
  if (message.length > MAX_REQUEST_MESSAGE) {
    return {
      ok: false,
      error: `Keep the note under ${MAX_REQUEST_MESSAGE} characters.`,
    };
  }
  return { ok: true, businessName, message: message || null };
}

/**
 * File a request. Returns false when this person already has one pending:
 * the partial unique index refuses the second, so a double-click or a reload
 * cannot queue the same person twice.
 */
export async function createAccessRequest(input: {
  clerkUserId: string;
  email: string;
  businessName: string;
  message: string | null;
}): Promise<boolean> {
  try {
    await db.insert(accessRequests).values({
      clerkUserId: input.clerkUserId,
      email: input.email.trim().toLowerCase(),
      businessName: input.businessName,
      message: input.message,
    });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

/** This person's most recent request, or null if they never asked. */
export async function latestAccessRequestFor(
  clerkUserId: string,
): Promise<AccessRequest | null> {
  const [row] = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.clerkUserId, clerkUserId))
    .orderBy(desc(accessRequests.createdAt), desc(accessRequests.id))
    .limit(1);
  return row ?? null;
}

export async function getAccessRequest(id: number): Promise<AccessRequest | null> {
  const [row] = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, id))
    .limit(1);
  return row ?? null;
}

/** Waiting requests, oldest first: the one that has waited longest is on top. */
export async function listPendingAccessRequests(): Promise<AccessRequest[]> {
  return db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.status, "pending"))
    .orderBy(asc(accessRequests.createdAt), asc(accessRequests.id));
}

export async function countPendingAccessRequests(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(accessRequests)
    .where(eq(accessRequests.status, "pending"));
  return row?.n ?? 0;
}

/**
 * Move a PENDING request to approved or declined, and return it. Null when it
 * is no longer pending, so two operators (or one double-click) cannot both
 * act on it: the second sees null and stops.
 */
export async function decideAccessRequest(
  id: number,
  status: Exclude<AccessRequestStatus, "pending">,
  adminId: number,
): Promise<AccessRequest | null> {
  const [row] = await db
    .update(accessRequests)
    .set({ status, decidedAt: new Date(), decidedByAdminId: adminId })
    .where(and(eq(accessRequests.id, id), eq(accessRequests.status, "pending")))
    .returning();
  return row ?? null;
}

/**
 * Put a request back to pending after the step that followed its decision
 * failed, so it is still in the queue to try again rather than marked done
 * with nothing done.
 */
export async function reopenAccessRequest(id: number): Promise<void> {
  await db
    .update(accessRequests)
    .set({ status: "pending", decidedAt: null, decidedByAdminId: null })
    .where(eq(accessRequests.id, id));
}

/** Record the workspace an approval created. */
export async function linkAccessRequestWorkspace(
  id: number,
  workspaceId: number,
): Promise<void> {
  await db
    .update(accessRequests)
    .set({ workspaceId })
    .where(eq(accessRequests.id, id));
}
