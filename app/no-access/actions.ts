"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveViewer } from "@/lib/viewer";
import { createAccessRequest, readAccessRequestFields } from "@/lib/access-requests";

/**
 * "Send request" on /no-access: ask Postbox for a workspace.
 *
 * A Server Action is a public POST endpoint, so it re-checks everything the
 * page checked. Only a signed-in person who is not an operator, has no
 * workspace, and has a VERIFIED primary email may ask: the email is what the
 * operator reads and what the approval is sent to, and an unverified one
 * could be anybody's.
 */
export async function requestAccessAction(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const viewer = await resolveViewer();
  if (viewer.isAdmin) redirect("/admin");
  if (viewer.workspace) redirect("/inbox");
  if (!viewer.email) {
    redirect(
      `/no-access?error=${encodeURIComponent(
        "Verify your email address first, then send the request.",
      )}`,
    );
  }

  const fields = readAccessRequestFields(formData);
  if (!fields.ok) {
    redirect(`/no-access?error=${encodeURIComponent(fields.error)}`);
  }

  // False means a request is already waiting; the page shows it either way.
  await createAccessRequest({
    clerkUserId: userId,
    email: viewer.email,
    businessName: fields.businessName,
    message: fields.message,
  });

  revalidatePath("/admin");
  redirect("/no-access");
}
