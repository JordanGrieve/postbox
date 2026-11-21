import type { Workspace } from "@/db/schema";
import { getWorkspaceByApiKey, getWorkspaceByInboundEmail } from "./data";
import { INBOUND_DOMAIN, POSTBOX_CONTACT_KEY, PUBLIC_CONTACT_LOCAL_PART } from "./config";

/**
 * Which workspace an inbound address belongs to.
 *
 * Every workspace has its own inbound address (`<slug>-<hex>@<domain>`), and
 * that is the normal case. The one addition is Postbox's own public address,
 * hello@ on the inbound domain (21 Nov 2026), which is printed on every
 * marketing page. Mail to it is filed in Postbox's own workspace — the one the
 * /contact form already posts into, named by POSTBOX_CONTACT_KEY — so it
 * becomes a ticket like any other enquiry instead of being dropped for
 * matching no workspace.
 *
 * It cannot collide with a client: generated addresses always carry a hex
 * suffix after a hyphen, so no workspace's address is ever "hello@".
 */
export function isPublicContactAddress(address: string, inboundDomain: string): boolean {
  return (
    address.trim().toLowerCase() ===
    `${PUBLIC_CONTACT_LOCAL_PART}@${inboundDomain.trim().toLowerCase()}`
  );
}

export async function workspaceForInboundAddress(
  address: string,
): Promise<Workspace | null> {
  if (isPublicContactAddress(address, INBOUND_DOMAIN)) {
    // Unset key: not configured, and there is no workspace to guess at.
    return POSTBOX_CONTACT_KEY ? getWorkspaceByApiKey(POSTBOX_CONTACT_KEY) : null;
  }
  return getWorkspaceByInboundEmail(address);
}
