"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_EMAIL_ACCENT,
  SIGN_OFF_MAX,
  emailAccent,
} from "@/lib/newsletter";
import { THEMES } from "@/lib/theme";
import ThemePicker from "./ThemePicker";

/**
 * Settings → Your business: what the workspace is called and how it appears in
 * replies and newsletters, as a list you READ, with a Change link on each line.
 *
 * ── THE DESIGN (20 Nov 2026, "Settings idea 3 — read, then Change") ──
 * This replaces three always-open forms (Appearance, Sender identity,
 * Newsletter branding) that each had their own Save button. Most visits to
 * this page are to check something, not to change it, and a wall of inputs
 * makes "what is it set to?" harder to answer than a sentence does. So every
 * line shows its value; Change opens an editor in place for that one line;
 * saving closes it again. Each line saves on its own — there is no page Save to
 * forget.
 *
 * ── NOTHING ABOUT SAVING IS NEW ──
 * Every editor PATCHes /api/workspace with the same fields the old forms sent,
 * and the route's rules still apply (a blank name is refused, "" clears an
 * optional field, the sign-off is normalised server-side). The brand colour
 * preview uses the renderer's own emailAccent, so this screen cannot promise a
 * colour the email will not use.
 *
 * ── THE LOGO ROW IN THE DESIGN IS NOT HERE ──
 * Logos need file storage, which does not exist (see the note in
 * db/schema.ts). A row offering "Add" with nothing behind it would be a lie.
 *
 * Client component: no lib/config import, direct or transitive. lib/newsletter
 * and lib/theme are pure.
 */

export type BusinessDetailsProps = {
  name: string;
  legalName: string | null;
  postalAddress: string | null;
  brandAccentHex: string | null;
  brandSignOff: string | null;
  /** The theme key, stored in the column still called `accent`. */
  theme: string;
};

type Patch = Partial<{
  name: string;
  legalName: string;
  postalAddress: string;
  brandAccentHex: string;
  brandSignOff: string;
}>;

export default function BusinessDetails(props: BusinessDetailsProps) {
  const { name, legalName, postalAddress, brandAccentHex, brandSignOff, theme } = props;
  const accent = brandAccentHex ?? DEFAULT_EMAIL_ACCENT;
  const themeLabel = THEMES.find((t) => t.key === theme)?.label ?? "Light";

  return (
    <dl className="stg-biz">
      <Row
        label="Business name"
        read={<span className="stg-biz-value">{name}</span>}
        editor={(done, labelId) => (
          <TextEditor
            labelId={labelId}
            initial={name}
            maxLength={80}
            required="Your business needs a name."
            toPatch={(v) => ({ name: v })}
            done={done}
          />
        )}
      />

      <Row
        label="Postal address"
        empty={!postalAddress}
        read={
          postalAddress ? (
            <span className="stg-biz-value stg-biz-lines">{postalAddress}</span>
          ) : (
            <span className="stg-biz-value stg-biz-value--empty">Not added yet</span>
          )
        }
        note={
          postalAddress
            ? undefined
            : "You’ll need this before you send a newsletter."
        }
        editor={(done, labelId) => (
          <TextEditor
            labelId={labelId}
            initial={postalAddress ?? ""}
            multiline
            maxLength={500}
            placeholder={"12 High Street\nHarrogate\nHG1 1AA"}
            hint="Printed at the foot of every newsletter, as the law requires."
            toPatch={(v) => ({ postalAddress: v })}
            done={done}
          />
        )}
      />

      <Row
        label="Name in newsletter footers"
        empty={!legalName}
        read={
          legalName ? (
            <span className="stg-biz-value">{legalName}</span>
          ) : (
            <span className="stg-biz-value stg-biz-value--empty">
              Same as your business name
            </span>
          )
        }
        editor={(done, labelId) => (
          <TextEditor
            labelId={labelId}
            initial={legalName ?? ""}
            maxLength={200}
            placeholder={name}
            hint={`Your registered or trading name, if it isn’t “${name}”. Leave empty to use that.`}
            toPatch={(v) => ({ legalName: v })}
            done={done}
          />
        )}
      />

      <Row
        label="Sign-off on newsletters"
        empty={!brandSignOff}
        read={
          brandSignOff ? (
            <span className="stg-biz-value">{brandSignOff}</span>
          ) : (
            <span className="stg-biz-value stg-biz-value--empty">None</span>
          )
        }
        editor={(done, labelId) => (
          <TextEditor
            labelId={labelId}
            initial={brandSignOff ?? ""}
            maxLength={SIGN_OFF_MAX}
            placeholder={`— Emma, ${name}`}
            toPatch={(v) => ({ brandSignOff: v })}
            done={done}
          />
        )}
      />

      <Row
        label="Brand colour"
        read={
          <span className="stg-biz-value">
            <span
              className="stg-biz-swatch"
              style={{ background: accent }}
              aria-hidden
            />
            {brandAccentHex ? accent : `Postbox default (${accent})`}
          </span>
        }
        editor={(done, labelId) => (
          <ColourEditor
            labelId={labelId}
            stored={brandAccentHex}
            done={done}
          />
        )}
      />

      <Row
        label="Postbox appearance"
        read={<span className="stg-biz-value">{themeLabel}</span>}
        editor={(done) => (
          <div className="stg-biz-editor">
            {/* Saves the moment a theme is picked, as it always has: the
                whole app repaints, which is its own confirmation. */}
            <ThemePicker value={theme} />
            <div className="stg-biz-actions">
              <button type="button" className="stg-button" onClick={() => done(false)}>
                Done
              </button>
            </div>
          </div>
        )}
      />
    </dl>
  );
}

/* ── One line: read, then Change ──────────────────────────────────── */

function Row({
  label,
  read,
  note,
  empty = false,
  editor,
}: {
  label: string;
  read: React.ReactNode;
  /** A consequence worth saying while reading, e.g. what an empty field stops. */
  note?: string;
  empty?: boolean;
  editor: (done: (saved: boolean) => void, labelId: string) => React.ReactNode;
}) {
  const labelId = useId();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const actionRef = useRef<HTMLButtonElement>(null);
  // Bumped each time the editor closes. A counter rather than a flag so the
  // effect fires on every close, and state rather than a ref so the close
  // callback handed to the editor never touches a ref during render.
  const [closes, setCloses] = useState(0);

  // Focus goes back to the Change button when the editor closes, so a
  // keyboard user is left where they started rather than at the top of the
  // page (2.4.3). Runs after commit, when the button has re-mounted.
  useEffect(() => {
    if (closes > 0) actionRef.current?.focus();
  }, [closes]);

  const action = empty ? "Add" : "Change";

  return (
    <div className="stg-biz-row" data-editing={editing || undefined}>
      <dt className="stg-biz-label" id={labelId}>
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
            {note && <span className="stg-biz-note">{note}</span>}
          </>
        )}
        {/* Always mounted, so the announcement is heard (4.1.3). */}
        <span className="stg-biz-saved" role="status">
          {saved && !editing ? "Saved." : ""}
        </span>
      </dd>
      {!editing && (
        <dd className="stg-biz-side">
          <button
            ref={actionRef}
            type="button"
            className="stg-biz-action"
            // Visible text first, then what it acts on (2.5.3, 2.4.9).
            aria-label={`${action} ${label.toLowerCase()}`}
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

/* ── Saving ───────────────────────────────────────────────────────── */

function useSave() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(patch: Patch): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "save failed");
      }
      startTransition(() => router.refresh());
      return true;
    } catch (err) {
      const msg = err instanceof Error && err.message !== "save failed" ? err.message : null;
      setError(msg ?? "Couldn’t save that — please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { save, saving: busy || pending, error };
}

/** Save and Cancel, shared by every editor. */
function Actions({
  saving,
  canSave,
  onCancel,
  error,
}: {
  saving: boolean;
  canSave: boolean;
  onCancel: () => void;
  error: string | null;
}) {
  return (
    <>
      <div className="stg-biz-actions">
        <button type="submit" className="stg-button" disabled={saving || !canSave}>
          {saving ? "Saving…" : "Save"}
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

/* ── Editors ──────────────────────────────────────────────────────── */

function TextEditor({
  labelId,
  initial,
  multiline = false,
  maxLength,
  placeholder,
  hint,
  required,
  toPatch,
  done,
}: {
  labelId: string;
  initial: string;
  multiline?: boolean;
  maxLength: number;
  placeholder?: string;
  hint?: string;
  /** If set, an empty value cannot be saved and this says why. */
  required?: string;
  toPatch: (value: string) => Patch;
  done: (saved: boolean) => void;
}) {
  const [value, setValue] = useState(initial);
  const { save, saving, error } = useSave();
  const hintId = useId();
  const blank = value.trim() === "";
  const unchanged = value.trim() === initial.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (unchanged) return done(false);
    if (required && blank) return;
    if (await save(toPatch(value))) done(true);
  }

  const common = {
    className: multiline ? "stg-input stg-textarea" : "stg-input",
    value,
    maxLength,
    placeholder,
    disabled: saving,
    autoFocus: true,
    "aria-labelledby": labelId,
    "aria-describedby": hint || (required && blank) ? hintId : undefined,
    "aria-invalid": required && blank ? true : undefined,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        done(false);
      }
    },
  };

  return (
    <form className="stg-biz-editor" onSubmit={submit}>
      {multiline ? (
        <textarea
          {...common}
          rows={3}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <input
          {...common}
          type="text"
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      {(hint || (required && blank)) && (
        <span className="stg-field-hint" id={hintId}>
          {required && blank ? required : hint}
        </span>
      )}
      <Actions
        saving={saving}
        canSave={!(required && blank)}
        onCancel={() => done(false)}
        error={error}
      />
    </form>
  );
}

function ColourEditor({
  labelId,
  stored,
  done,
}: {
  labelId: string;
  stored: string | null;
  done: (saved: boolean) => void;
}) {
  const [colour, setColour] = useState(stored ?? DEFAULT_EMAIL_ACCENT);
  const { save, saving, error } = useSave();
  const hintId = useId();

  // The renderer's own function, not a copy of its rules: if the contrast floor
  // moves, this preview moves with it. See lib/email-colour.ts.
  const asSent = emailAccent(colour, "#ffffff");
  const adjusted = asSent.toLowerCase() !== colour.toLowerCase();
  const unchanged = colour.toLowerCase() === (stored ?? DEFAULT_EMAIL_ACCENT).toLowerCase();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (unchanged) return done(false);
    if (await save({ brandAccentHex: colour })) done(true);
  }

  return (
    <form className="stg-biz-editor" onSubmit={submit}>
      <span className="stg-brand-row">
        <input
          className="stg-colour"
          type="color"
          value={colour}
          disabled={saving}
          autoFocus
          aria-labelledby={labelId}
          aria-describedby={hintId}
          onChange={(e) => setColour(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              done(false);
            }
          }}
        />
        {/* The swatch and the sentence say the same thing; the sentence is
            what a screen reader gets. */}
        <span className="stg-brand-sample" style={{ color: asSent }} aria-hidden>
          Read the full story
        </span>
        {stored !== null && (
          <button
            type="button"
            className="stg-brand-reset"
            disabled={saving}
            onClick={async () => {
              if (await save({ brandAccentHex: "" })) done(true);
            }}
          >
            Use the default
          </button>
        )}
      </span>
      <span className="stg-field-hint" id={hintId}>
        {adjusted ? (
          <>
            Your colour is too light to read as a link, so emails use{" "}
            <b>{asSent}</b> — the closest shade of it that stays legible.
          </>
        ) : (
          <>
            Links in your newsletters will be <b>{asSent}</b>.
          </>
        )}
      </span>
      <Actions
        saving={saving}
        canSave
        onCancel={() => done(false)}
        error={error}
      />
    </form>
  );
}
