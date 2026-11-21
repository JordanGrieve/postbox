"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveViewer } from "@/lib/viewer";
import { recordOperatorAction } from "@/lib/operator-actions";
import {
  createForm,
  renameForm,
  revokeFormKey,
  regenerateFormKey,
} from "@/lib/forms";

/**
 * Named contact forms, managed by the client.
 *
 * ── EVERY EXPORT IS A PUBLIC POST ENDPOINT ──
 * A "use server" module's exports are callable by anyone who can guess the
 * action id, with any arguments. So the workspace is re-resolved from the
 * session on every call and never read from the form, and the form id is only
 * ever used inside a statement that also pins the workspace — see lib/forms.ts,
 * where each mutation carries its own predicate. An id belonging to another
 * workspace therefore matches no row and changes nothing.
 *
 * ── NOTHING HERE DELETES A FORM ──
 * Deliberate, and it is the difference between this and most CRUD screens.
 * tickets.form_id is ON DELETE SET NULL, so removing a form would silently
 * blank the provenance of every enquiry that ever arrived through it. The
 * destructive-looking action is REVOKE, which stops the key working and leaves
 * the history alone.
 */

async function requireWorkspace() {
  const viewer = await resolveViewer();
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");
  return viewer.workspace;
}

/**
 * A Postbox operator changing forms as the client is recorded first, or the
 * change is refused (lib/operator-actions.ts). These actions return nothing,
 * so a refusal throws to the error boundary; it only happens when the access
 * log cannot be written.
 */
async function recordedOrThrow(detail: string): Promise<void> {
  const refused = await recordOperatorAction("operator_settings_changed", `Forms: ${detail}`);
  if (refused) throw new Error(refused);
}

function formIdFrom(formData: FormData): number | null {
  const id = Number(formData.get("formId"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function createFormAction(formData: FormData): Promise<void> {
  const workspace = await requireWorkspace();
  const name = String(formData.get("name") ?? "");

  // An empty name is a slip, not an attack: the field is required in the
  // markup, so this is the case where somebody submitted with the keyboard
  // before typing. Returning silently leaves the page as it was.
  await recordedOrThrow(`created "${name.trim().slice(0, 80)}"`);
  await createForm({ workspaceId: workspace.id, name });

  revalidatePath("/settings/forms");
}

export async function renameFormAction(formData: FormData): Promise<void> {
  const workspace = await requireWorkspace();
  const formId = formIdFrom(formData);
  if (!formId) return;

  await recordedOrThrow(`renamed form #${formId}`);
  await renameForm({
    workspaceId: workspace.id,
    formId,
    name: String(formData.get("name") ?? ""),
  });

  revalidatePath("/settings/forms");
}

export async function revokeFormKeyAction(formData: FormData): Promise<void> {
  const workspace = await requireWorkspace();
  const formId = formIdFrom(formData);
  if (!formId) return;

  await recordedOrThrow(`revoked the key of form #${formId}`);
  await revokeFormKey({ workspaceId: workspace.id, formId });

  /*
   * The install screen shows the snippet for each form, so a revoked key must
   * disappear from there in the same breath. Revalidating only this page would
   * leave a copyable snippet carrying a key that no longer works — which is
   * the bakery's six-week failure with a shorter fuse.
   */
  revalidatePath("/settings/forms");
  revalidatePath("/settings/install");
}

export async function regenerateFormKeyAction(
  formData: FormData,
): Promise<void> {
  const workspace = await requireWorkspace();
  const formId = formIdFrom(formData);
  if (!formId) return;

  await recordedOrThrow(`replaced the key of form #${formId}`);
  await regenerateFormKey({ workspaceId: workspace.id, formId });

  revalidatePath("/settings/forms");
  revalidatePath("/settings/install");
}
