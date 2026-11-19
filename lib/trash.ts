/**
 * Trash: the rules half. Pure — no database, no clock of its own.
 *
 * ── THE POLICY ──
 * Deleting a ticket hides it for 30 days, then destroys it. That is what every
 * mail client a client already uses means by "delete", and it is the only
 * arrangement where a stray click does not permanently lose a customer's
 * enquiry.
 *
 * The 30 days are not a grace period bolted onto a delete — they are the
 * delete. Nothing else in the product removes a ticket, so this sweep is the
 * only path by which customer correspondence leaves the database, which is
 * exactly why it is bounded, logged, and refuses to run on anything it cannot
 * prove is due.
 */

/**
 * How long a deleted ticket is recoverable.
 *
 * 30 days because that is what Gmail, Outlook and Apple Mail all do, and a
 * client's intuition about "deleted" is built entirely from those. A shorter
 * window would surprise somebody who came back after a fortnight's holiday;
 * a longer one keeps customer data alive past the point anybody asked for.
 */
export const TRASH_RETENTION_DAYS = 30;

/*
  Moving a ticket to the trash, restoring it and the wording the trash screen
  used (days left, who deleted it) were removed with the trash interface on
  19 Nov 2026. Nothing can trash a ticket any more; the purge in
  lib/trash-store.ts still runs so tickets trashed before then are destroyed
  on schedule.
*/
