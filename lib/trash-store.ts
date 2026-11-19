import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { TRASH_RETENTION_DAYS } from "./trash";

/**
 * Trash: the IO half. The rules live in lib/trash.ts.
 *
 * Only the purge is left (19 Nov 2026). Moving a ticket to the trash and
 * restoring it went with the trash interface; this sweep still runs so
 * tickets trashed before then are destroyed on schedule.
 */

/**
 * Permanently destroy tickets whose 30 days are up.
 *
 * ── THIS IS THE ONLY THING IN THE PRODUCT THAT DESTROYS CUSTOMER MAIL ──
 * Nothing else deletes a ticket. So this statement is written to be provably
 * conservative rather than merely correct:
 *
 *  - `deleted_at IS NOT NULL` first. A null is a live ticket, and no arithmetic
 *    on a null should ever be able to select one. Postgres would not, but the
 *    predicate says so anyway because the cost of being wrong here is a
 *    client's correspondence and there is no backup to restore it from.
 *  - The interval is computed IN POSTGRES from the same clock that stamped
 *    `deleted_at`. Passing a cutoff from JS would compare the database's
 *    timestamps against a serverless instance's idea of the time, and those
 *    disagree often enough to matter when the answer is destruction.
 *  - LIMIT via a CTE, so one neglected month cannot turn into an enormous
 *    statement. Nothing here is time-critical; the rest go on the next run.
 *
 * Child rows all cascade — messages, labels, stars, reads, and any files
 * hanging off those messages — so this really does remove everything rather
 * than orphaning it.
 *
 * (Phrased without naming that last table, because tests/unused-tables.test.ts
 * matches the word anywhere in a file and would read a comment as a use. The
 * alternative was exempting this file, which would blind the guard to a real
 * use here later — and file storage is exactly where one will appear.)
 *
 * PLATFORM-WIDE and therefore unscoped by workspace: it runs from the daily
 * health sweep and its whole job is every tenant's expired trash. It reads no
 * addresses and no content — it returns ids and a count.
 */
export async function purgeExpiredTrash(limit = 200): Promise<{
  purged: number;
  workspaceIds: number[];
}> {
  const res = await db.execute(sql`
    WITH due AS (
      SELECT t.id, t.workspace_id
      FROM tickets t
      WHERE t.deleted_at IS NOT NULL
        AND t.deleted_at <= now() - (${TRASH_RETENTION_DAYS} * interval '1 day')
      ORDER BY t.deleted_at
      LIMIT ${limit}
    )
    DELETE FROM tickets
    WHERE id IN (SELECT id FROM due)
    RETURNING id, workspace_id
  `);

  const rows = res.rows as Array<{ workspace_id: number }>;
  return {
    purged: rows.length,
    workspaceIds: [...new Set(rows.map((r) => Number(r.workspace_id)))],
  };
}
