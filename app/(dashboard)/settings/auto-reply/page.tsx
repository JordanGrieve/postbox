import { redirect } from "next/navigation";
import { resolveViewer } from "@/lib/viewer";
import { DEFAULT_CONFIG } from "@/lib/auto-reply";
import { getAutoReplyConfig } from "@/lib/auto-reply-send";
import { SettingsHeader } from "../rows";
import AutoReplyDetails from "./AutoReplyDetails";

export const metadata = { title: "Auto-reply · Settings" };

/**
 * /settings/auto-reply — the automatic "we got your message".
 *
 * Built to the 20 Nov 2026 design (read, then Change). See AutoReplyDetails
 * for why each line saves on its own.
 */
export default async function AutoReplyPage() {
  const viewer = await resolveViewer();
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");
  const workspace = viewer.workspace;

  const stored = await getAutoReplyConfig(workspace.id);

  return (
    <div className="stg-wrap">
      <SettingsHeader
        title="Auto-reply"
        sub="An instant “we got your message” for anyone who gets in touch."
      />
      <AutoReplyDetails
        initialConfig={stored ?? DEFAULT_CONFIG}
        workspaceName={workspace.name}
      />
    </div>
  );
}
