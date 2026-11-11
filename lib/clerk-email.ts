/**
 * The one address on a Clerk account that may be used as a credential.
 *
 * An email address is what claims a workspace invite and what elevates a
 * first-time sign-in to operator, so it has to be an address the person has
 * proved they control. Two rules, both of which the previous code broke:
 *
 *  1. PRIMARY ONLY. It used to fall back to the first entry in the account's
 *     address list, which is any address the user has added, in whatever order
 *     Clerk returns them.
 *  2. VERIFIED ONLY. It never looked at the verification status at all. That
 *     was safe only because sign-in is Google OAuth, where Google has verified
 *     the address; that is a Clerk dashboard setting and nothing here asserted
 *     it. With email-code sign-up enabled, or a user adding a second address,
 *     an unverified address would have claimed somebody else's invite.
 *
 * Returns null when there is no such address. Callers must treat null as "this
 * person has no identity we can match on", never substitute a default.
 *
 * Pure, and typed structurally so a test can pass a plain object.
 */
export type ClerkEmailCarrier =
  | {
      primaryEmailAddress?: {
        emailAddress: string;
        verification: { status: string } | null;
      } | null;
    }
  | null
  | undefined;

export function verifiedPrimaryEmail(user: ClerkEmailCarrier): string | null {
  const primary = user?.primaryEmailAddress;
  if (!primary) return null;
  if (primary.verification?.status !== "verified") return null;
  const email = primary.emailAddress.trim().toLowerCase();
  return email || null;
}
