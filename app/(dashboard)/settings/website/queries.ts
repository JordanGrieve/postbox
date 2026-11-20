import "server-only";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { subscribers, tickets } from "@/db/schema";

/**
 * The two facts Settings → Website & email states about the connections:
 * when the website's contact form last delivered something, and when the
 * newsletter sign-up last did. Null means never.
 *
 * Trashed tickets count: the question is "is the form arriving", and a message
 * that arrived and was then deleted did arrive.
 */
export async function lastArrivals(workspaceId: number): Promise<{
  contactForm: Date | null;
  signup: Date | null;
}> {
  const [[form], [signup]] = await Promise.all([
    db
      .select({ at: max(tickets.createdAt) })
      .from(tickets)
      .where(and(eq(tickets.workspaceId, workspaceId), eq(tickets.source, "contact_form"))),
    db
      .select({ at: max(subscribers.consentAt) })
      .from(subscribers)
      .where(
        and(
          eq(subscribers.workspaceId, workspaceId),
          eq(subscribers.consentMethod, "signup_form"),
        ),
      ),
  ]);
  return { contactForm: form?.at ?? null, signup: signup?.at ?? null };
}
