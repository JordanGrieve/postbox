"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveViewer } from "@/lib/viewer";
import { createAccessRequest, readAccessRequestFields } from "@/lib/access-requests";
import { listAdmins } from "@/lib/admin";
import { sendAccessRequestAlert } from "@/lib/email";
import { APP_URL, EMAIL_FROM_ADDRESS } from "@/lib/config";

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
  const created = await createAccessRequest({
    clerkUserId: userId,
    email: viewer.email,
    businessName: fields.businessName,
    message: fields.message,
  });

  // Tell the operators, so a request is seen the same day rather than when
  // somebody next opens the console. Only for a new request (a reload must not
  // send a second alert), and best effort: the request is saved either way,
  // and a mail outage must not turn "Send request" into an error page.
  if (created) {
    try {
      const admins = await listAdmins();
      await sendAccessRequestAlert({
        to: admins.map((a) => a.email),
        from: EMAIL_FROM_ADDRESS,
        requesterEmail: viewer.email,
        businessName: fields.businessName,
        message: fields.message,
        consoleUrl: `${APP_URL}/admin?section=requests`,
      });
    } catch (err) {
      console.error("[access-requests] could not alert the operators:", err);
    }
  }

  revalidatePath("/admin");
  redirect("/no-access");
}
