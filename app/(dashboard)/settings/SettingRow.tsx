"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * The read-then-Change line every redesigned settings page is built from
 * (Your business, Auto-reply; 20 Nov 2026 designs). One place, so the pages
 * cannot drift into four slightly different rows.
 *
 * A row shows a label and a value with an action on the right. The action
 * opens the row's "editor" in place — an editor proper, or anything else the
 * row reveals, like the list behind "See the list" — and the editor calls
 * `done` to close it again. Focus goes back to the action when it closes
 * (2.4.3), and "Saved." is announced from a live region that is always
 * mounted (4.1.3).
 *
 * Rows that only link somewhere, or show a fact, are plain markup with the
 * same classes: see InfoRow in ./rows.tsx.
 */

export type Done = (saved: boolean) => void;

export function SettingRow({
  label,
  read,
  note,
  quietNote = false,
  empty = false,
  actionText,
  actionLabel,
  danger = false,
  hideLabel = false,
  editor,
}: {
  label: string;
  read: React.ReactNode;
  /** Said while reading, e.g. what an empty field stops. */
  note?: React.ReactNode;
  /** The note is context, not a warning. */
  quietNote?: boolean;
  /** Empty fields say "Add" rather than "Change". */
  empty?: boolean;
  /** Visible action text, when it is neither Add nor Change. */
  actionText?: string;
  /** Accessible name; must start with the visible text (2.5.3). */
  actionLabel?: string;
  /** The action destroys or ends something (Close workspace). */
  danger?: boolean;
  /** The value already says what the label would; keep the label for
      screen readers only, so it is not read out twice on screen. */
  hideLabel?: boolean;
  editor: (done: Done, labelId: string) => React.ReactNode;
}) {
  const labelId = useId();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const actionRef = useRef<HTMLButtonElement>(null);
  // Bumped each time the editor closes. A counter rather than a flag so the
  // effect fires on every close, and state rather than a ref so the close
  // callback handed to the editor never touches a ref during render.
  const [closes, setCloses] = useState(0);

  useEffect(() => {
    if (closes > 0) actionRef.current?.focus();
  }, [closes]);

  const action = actionText ?? (empty ? "Add" : "Change");

  return (
    <div className="stg-biz-row" data-editing={editing || undefined}>
      <dt className={hideLabel ? "stg-sr-only" : "stg-biz-label"} id={labelId}>
        {label}
      </dt>
      <dd className="stg-biz-body">
        {editing ? (
          editor((didSave) => {
            setSaved(didSave);
            setEditing(false);
            setCloses((n) => n + 1);
          }, labelId)
        ) : (
          <>
            {read}
            {note && (
              <span className={quietNote ? "stg-biz-note stg-biz-note--quiet" : "stg-biz-note"}>
                {note}
              </span>
            )}
          </>
        )}
        <span className="stg-biz-saved" role="status">
          {saved && !editing ? "Saved." : ""}
        </span>
      </dd>
      {!editing && (
        <dd className="stg-biz-side">
          <button
            ref={actionRef}
            type="button"
            className={danger ? "stg-biz-action stg-biz-action--danger" : "stg-biz-action"}
            aria-label={actionLabel ?? `${action} ${label.toLowerCase()}`}
            onClick={() => {
              setSaved(false);
              setEditing(true);
            }}
          >
            {action}
          </button>
        </dd>
      )}
    </div>
  );
}

/**
 * Send one change and report how it went.
 *
 * `refresh` re-runs the server component above (for values the server renders,
 * like the workspace's name); a page that holds its own state reads the
 * response instead.
 */
export function useSave<T = unknown>(
  url: string,
  { method = "PATCH", refresh = true }: { method?: string; refresh?: boolean } = {},
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(body: unknown): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as T & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn’t save that — please try again.");
        return null;
      }
      if (refresh) startTransition(() => router.refresh());
      return data;
    } catch {
      setError("Couldn’t reach Postbox — check your connection and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { save, saving: busy || pending, error };
}

/** Save and Cancel, shared by every editor. */
export function EditorActions({
  saving,
  canSave = true,
  onCancel,
  error,
  saveText = "Save",
}: {
  saving: boolean;
  canSave?: boolean;
  onCancel: () => void;
  error: string | null;
  saveText?: string;
}) {
  return (
    <>
      <div className="stg-biz-actions">
        <button type="submit" className="stg-button" disabled={saving || !canSave}>
          {saving ? "Saving…" : saveText}
        </button>
        <button
          type="button"
          className="stg-button stg-button--secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="stg-identity-warn stg-biz-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/** Escape closes an editor without saving. For the editor's inputs. */
export function escapeCloses(done: Done) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      done(false);
    }
  };
}
