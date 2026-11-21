/**
 * The one "does this look like an email address?" check.
 *
 * Light on purpose: something@something.something, no spaces. It rejects
 * obvious junk and nothing else; deliverability is the provider's question.
 *
 * There were four byte-identical copies of this pattern (lib/newsletter.ts,
 * lib/team.ts, lib/auto-reply-guards.ts and lib/http.ts) until 21 Nov 2026.
 * The first three now import this. lib/http.ts's isValidEmail is the same
 * pattern and still has its own copy; point it here when that file is next
 * edited. tests/email-address.test.ts pins the behaviour, so a lost
 * backslash in this pattern fails a test rather than accepting everything.
 *
 * Pure, no imports: safe in client components and the edge.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function looksLikeEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}
