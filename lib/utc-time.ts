/**
 * Absolute, UTC, deterministic date formatting for audit records: the
 * operator console and the client's own Access log.
 *
 * Both screens show ONE record (impersonation_sessions, admin_actions), and a
 * client must be able to quote a row back to us and have it match what we
 * see, so the formatter is shared rather than written twice. It lived in the
 * console's app/(admin)/admin/ui.tsx, which the client's Access log imported
 * across route groups; it moved here on 21 Nov 2026 and ui.tsx re-exports it.
 *
 * Deliberately NOT lib/serialize.ts's formatDateTime, which is the relative,
 * local-time "Today, 9:24 AM" of a conversation thread. That one answers
 * "how long ago?"; this one answers "exactly when?", with the zone stated,
 * and renders the same on the server and in any browser.
 */

/** "14 Aug 2026". */
export function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Date *and* time, UTC, for the access log. "14 Aug 2026" is useless when the
 * question is which of two visits read a particular message, and a local-zone
 * render would disagree between the server and whoever reads it, so the zone
 * is stated rather than assumed.
 */
export function formatDateTime(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return `${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(d)} UTC`;
}

/** Coarse elapsed time between two instants — "4 min", "1 h 12 min". */
export function formatDuration(
  from: Date | string,
  to: Date | string,
): string {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
