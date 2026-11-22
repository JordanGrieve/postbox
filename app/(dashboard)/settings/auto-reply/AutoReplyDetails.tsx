"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { AutoReplySchedule, BusinessHours } from "@/db/schema";
import {
  DEFAULT_OUT_OF_HOURS_BODY,
  MERGE_TOKENS,
  buildMergeValues,
  planDeferral,
  renderTemplate,
  type AutoReplyConfig,
} from "@/lib/auto-reply";
import {
  DAY_SHORT,
  DEFAULT_BUSINESS_HOURS,
  describeOpeningHours,
  evaluateSchedule,
  isWithinBusinessHours,
  zonedParts,
} from "@/lib/business-hours";
// Not "@/lib/tickets": that reaches lib/config, which is server-only.
import { previewText } from "@/lib/ticket-format";
import { EditorActions, SettingRow, escapeCloses, useSave, type Done } from "../SettingRow";

/**
 * Settings → Auto-reply, read-then-Change (20 Nov 2026 design).
 *
 * Replaces a two-column form with one Save button for everything. Each line
 * now says what is set and saves on its own through PATCH /api/auto-reply,
 * which merges a partial body over what is stored — so changing the opening
 * hours cannot also save a half-typed message.
 *
 * ── THE SEND PATH'S OWN FUNCTIONS, NOT COPIES ──
 * "Right now it's 21:50, so you're closed" uses isWithinBusinessHours and
 * evaluateSchedule; when a held reply goes out uses planDeferral; the preview
 * uses renderTemplate and buildMergeValues. A screen that predicted the sender
 * with its own rules would be wrong the day the rules changed.
 *
 * Delay has no row: only "immediately" works on this deployment, and the
 * route refuses the others, so there is nothing to choose (Jordan, 9 Sep 2026:
 * hide unbuilt options rather than show them).
 */

const SEND_TO: { value: AutoReplySchedule; label: string; hint: string }[] = [
  {
    value: "always",
    label: "Every new message, any time",
    hint: "Out of hours, they get the “when you’re closed” message if you’ve written one.",
  },
  {
    value: "business_hours",
    label: "Only while you’re open",
    hint: "Messages that arrive while you’re closed get theirs shortly after you open.",
  },
  {
    value: "out_of_hours",
    label: "Only while you’re closed",
    hint: "During opening hours nothing is sent — you’re there to answer.",
  },
];

/** Fallback when the browser cannot list time zones. */
const FALLBACK_ZONES = [
  "UTC", "Europe/London", "Europe/Dublin", "Europe/Paris", "Europe/Berlin",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Asia/Kolkata", "Asia/Singapore", "Australia/Sydney", "Pacific/Auckland",
];

function timeZones(): string[] {
  try {
    const list = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    if (list?.length) return list;
  } catch {
    // Older engine.
  }
  return FALLBACK_ZONES;
}

/** "{first_name}" → "{First name}": how the design writes tokens for reading. */
function readable(template: string): string {
  let out = template;
  for (const t of MERGE_TOKENS) out = out.split(t.token).join(`{${t.label}}`);
  return out;
}

/** "Monday at 09:00", in the workspace's zone — the clock its staff read. */
function describeMoment(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("weekday")} at ${get("hour")}:${get("minute")}`;
  } catch {
    return "the next time you’re open";
  }
}

type SaveResult = { config?: AutoReplyConfig };

/**
 * Save part of the config. The route answers with the whole stored config,
 * which goes straight back into the page, so every row shows what is stored.
 */
function useAutoReplySave(onSaved: (config: AutoReplyConfig) => void) {
  const s = useSave<SaveResult>("/api/auto-reply", { refresh: false });
  return {
    saving: s.saving,
    error: s.error,
    save: async (patch: Partial<AutoReplyConfig>): Promise<boolean> => {
      const result = await s.save(patch);
      if (result?.config) onSaved(result.config);
      return result !== null;
    },
  };
}

export default function AutoReplyDetails({
  initialConfig,
  workspaceName,
}: {
  initialConfig: AutoReplyConfig;
  workspaceName: string;
}) {
  const [config, setConfig] = useState<AutoReplyConfig>(initialConfig);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewId = useId();

  const toggle = useAutoReplySave(setConfig);
  const hours = config.businessHours;

  // What would happen to an enquiry arriving this second — the send path's
  // own evaluation.
  const now = new Date();
  const clockParts = zonedParts(now, config.timezone);
  const clock = `${String(clockParts.hour).padStart(2, "0")}:${String(clockParts.minute).padStart(2, "0")}`;
  const openNow = isWithinBusinessHours(now, hours, config.timezone);
  const scheduleNow = evaluateSchedule(config.scheduleMode, now, hours, config.timezone);
  const heldUntil = planDeferral(config, now);
  const dropped =
    config.scheduleMode === "business_hours" && !scheduleNow.allowed && !heldUntil;

  const closedMessageUsed = config.scheduleMode !== "business_hours";
  const sendTo = SEND_TO.find((s) => s.value === config.scheduleMode) ?? SEND_TO[0]!;

  return (
    <>
      {/* ── On or off ───────────────────────────────────────────── */}
      <section className="stg-biz-status" data-on={config.enabled || undefined}>
        <span className="stg-biz-status-dot" aria-hidden />
        <div className="stg-biz-status-text">
          <h2 className="stg-biz-status-title">
            Auto-reply is {config.enabled ? "on" : "off"}
          </h2>
          {/* When it is on, the rows below say who gets one; only "off" needs
              saying (settings review, 22 Nov 2026). */}
          {!config.enabled && (
            <p className="stg-biz-status-sub">
              Customers won’t get an automatic reply until you turn it on.
            </p>
          )}
          {toggle.error && (
            <p className="stg-identity-warn stg-biz-error" role="alert">
              {toggle.error}
            </p>
          )}
        </div>
        <button
          type="button"
          className="stg-button"
          disabled={toggle.saving}
          onClick={() => void toggle.save({ enabled: !config.enabled })}
        >
          {toggle.saving ? "Saving…" : config.enabled ? "Turn off" : "Turn on"}
        </button>
      </section>

      {/* ── When it sends ───────────────────────────────────────── */}
      <section className="stg-biz-group">
        <h2 className="stg-biz-heading">When it sends</h2>
        <dl className="stg-biz">
          <SettingRow
            label="Send it to"
            read={<span className="stg-biz-value">{sendTo.label}</span>}
            editor={(done, labelId) => (
              <SendToEditor
                labelId={labelId}
                value={config.scheduleMode}
                onSaved={setConfig}
                done={done}
              />
            )}
          />
          <SettingRow
            label="Opening hours"
            read={
              <span className="stg-biz-value">
                {describeOpeningHours(hours, config.timezone)}
              </span>
            }
            note={
              dropped ? (
                "No open days are set, so a message that arrives while you’re closed never gets a reply. Pick at least one day."
              ) : (
                <span suppressHydrationWarning>
                  Right now it’s {clock}, so you’re {openNow ? "open" : "closed"}
                  {heldUntil
                    ? ` — a reply would go out shortly after ${describeMoment(heldUntil, config.timezone)}`
                    : ""}
                  .
                </span>
              )
            }
            quietNote={!dropped}
            editor={(done, labelId) => (
              <HoursEditor
                labelId={labelId}
                hours={hours ?? DEFAULT_BUSINESS_HOURS}
                timezone={config.timezone}
                onSaved={setConfig}
                done={done}
              />
            )}
          />
        </dl>
      </section>

      {/* ── What it says ────────────────────────────────────────── */}
      <section className="stg-biz-group">
        <h2 className="stg-biz-heading">What it says</h2>
        <dl className="stg-biz">
          <SettingRow
            label="Message"
            read={<span className="stg-biz-value">{readable(config.subject)}</span>}
            note={previewText(readable(config.body), 110)}
            quietNote
            editor={(done, labelId) => (
              <MessageEditor
                labelId={labelId}
                subject={config.subject}
                body={config.body}
                onSaved={setConfig}
                done={done}
              />
            )}
          />
          <SettingRow
            label="When you’re closed"
            empty={closedMessageUsed && !config.outOfHoursBody?.trim()}
            read={
              !closedMessageUsed ? (
                <span className="stg-biz-value stg-biz-value--empty">
                  Not used — nothing goes out while you’re closed
                </span>
              ) : config.outOfHoursBody?.trim() ? (
                <span className="stg-biz-value">
                  {previewText(readable(config.outOfHoursBody), 90)}
                </span>
              ) : (
                <span className="stg-biz-value stg-biz-value--empty">
                  The same message, at all hours
                </span>
              )
            }
            editor={(done, labelId) => (
              <ClosedEditor
                labelId={labelId}
                body={config.outOfHoursBody ?? ""}
                onSaved={setConfig}
                done={done}
              />
            )}
          />
        </dl>
        <button
          type="button"
          className="stg-biz-more"
          aria-expanded={previewOpen}
          aria-controls={previewId}
          onClick={() => setPreviewOpen((v) => !v)}
        >
          {previewOpen ? "Hide the preview" : "Preview what customers get"}
        </button>
        {previewOpen && (
          <div id={previewId}>
            <Preview config={config} workspaceName={workspaceName} />
          </div>
        )}
      </section>

      {/* ── Good manners ────────────────────────────────────────── */}
      <section className="stg-biz-group">
        <h2 className="stg-biz-heading">Good manners</h2>
        <dl className="stg-biz">
          <SettingRow
            label="If a teammate has already replied"
            read={
              <span className="stg-biz-value">
                {config.skipIfTeammateReplied
                  ? "Don’t send one — they’ve already been answered"
                  : "Send one anyway"}
              </span>
            }
            editor={(done, labelId) => (
              <TeammateEditor
                labelId={labelId}
                skip={config.skipIfTeammateReplied}
                onSaved={setConfig}
                done={done}
              />
            )}
          />
          <SettingRow
            label="Never sent to"
            read={
              <span className="stg-biz-value">
                Other robots, mailing lists, and anyone who’s had one recently
              </span>
            }
            actionText="See the list"
            actionLabel="See the list of who never gets an auto-reply"
            editor={(done) => <NeverSentTo done={done} />}
          />
        </dl>
      </section>
    </>
  );
}

type OnSaved = (config: AutoReplyConfig) => void;

/* ── Editors ──────────────────────────────────────────────────────── */

function SendToEditor({
  labelId,
  value,
  onSaved,
  done,
}: {
  labelId: string;
  value: AutoReplySchedule;
  onSaved: OnSaved;
  done: Done;
}) {
  const [choice, setChoice] = useState(value);
  const { save, saving, error } = useAutoReplySave(onSaved);
  const name = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (choice === value) return done(false);
    if (await save({ scheduleMode: choice })) done(true);
  }

  return (
    <form className="stg-biz-editor" onSubmit={submit}>
      <fieldset className="stg-biz-choices" aria-labelledby={labelId}>
        {SEND_TO.map((s) => (
          // The hint describes the option rather than naming it, so the radio
          // is announced by its short label and the hint follows (1.3.1).
          <div className="stg-biz-choice" key={s.value}>
            <input
              id={`${name}-${s.value}`}
              type="radio"
              name={name}
              value={s.value}
              checked={choice === s.value}
              autoFocus={choice === s.value}
              aria-describedby={`${name}-${s.value}-hint`}
              onChange={() => setChoice(s.value)}
              onKeyDown={escapeCloses(done)}
            />
            <label className="stg-biz-choice-label" htmlFor={`${name}-${s.value}`}>
              {s.label}
            </label>
            <span className="stg-biz-choice-hint" id={`${name}-${s.value}-hint`}>
              {s.hint}
            </span>
          </div>
        ))}
      </fieldset>
      <EditorActions saving={saving} onCancel={() => done(false)} error={error} />
    </form>
  );
}

function HoursEditor({
  labelId,
  hours,
  timezone,
  onSaved,
  done,
}: {
  labelId: string;
  hours: BusinessHours;
  timezone: string;
  onSaved: OnSaved;
  done: Done;
}) {
  const [days, setDays] = useState<number[]>(hours.days);
  const [start, setStart] = useState(hours.start);
  const [end, setEnd] = useState(hours.end);
  const [zone, setZone] = useState(timezone);
  const zones = useMemo(() => timeZones(), []);
  const { save, saving, error } = useAutoReplySave(onSaved);

  // Monday first, as people read a week.
  const order = [1, 2, 3, 4, 5, 6, 0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await save({
      businessHours: { days: [...days].sort((a, b) => a - b), start, end },
      timezone: zone,
    });
    if (ok) done(true);
  }

  return (
    <form className="stg-biz-editor" onSubmit={submit}>
      <div className="stg-biz-days" role="group" aria-labelledby={labelId}>
        {order.map((d, i) => {
          const on = days.includes(d);
          return (
            <button
              key={d}
              type="button"
              className="stg-biz-day"
              aria-pressed={on}
              autoFocus={i === 0}
              onKeyDown={escapeCloses(done)}
              onClick={() =>
                setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))
              }
            >
              {DAY_SHORT[d]}
            </button>
          );
        })}
      </div>
      <div className="stg-biz-times">
        <label className="stg-field">
          <span className="stg-field-label">Opens</span>
          <input
            type="time"
            className="stg-input"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            onKeyDown={escapeCloses(done)}
          />
        </label>
        <label className="stg-field">
          <span className="stg-field-label">Closes</span>
          <input
            type="time"
            className="stg-input"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            onKeyDown={escapeCloses(done)}
          />
        </label>
      </div>
      <label className="stg-field">
        <span className="stg-field-label">Time zone</span>
        <select
          className="stg-input"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          onKeyDown={escapeCloses(done)}
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>
      <EditorActions saving={saving} onCancel={() => done(false)} error={error} />
    </form>
  );
}

/** Buttons that insert a merge token at the caret of the given field. */
function Tokens({
  target,
}: {
  target: () => HTMLInputElement | HTMLTextAreaElement | null;
}) {
  return (
    <div className="stg-biz-tokens" role="group" aria-label="Insert a detail">
      {MERGE_TOKENS.map((t) => (
        <button
          key={t.name}
          type="button"
          className="stg-biz-token"
          title={t.hint}
          onClick={() => {
            const el = target();
            if (!el) return;
            const startAt = el.selectionStart ?? el.value.length;
            const endAt = el.selectionEnd ?? el.value.length;
            // setRangeText fires no React change event, so dispatch an input
            // event to keep the controlled value in step.
            el.setRangeText(t.token, startAt, endAt, "end");
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.focus();
          }}
        >
          + {t.label}
        </button>
      ))}
    </div>
  );
}

function MessageEditor({
  labelId,
  subject,
  body,
  onSaved,
  done,
}: {
  labelId: string;
  subject: string;
  body: string;
  onSaved: OnSaved;
  done: Done;
}) {
  const [s, setS] = useState(subject);
  const [b, setB] = useState(body);
  const last = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const { save, saving, error } = useAutoReplySave(onSaved);
  const blank = !s.trim() || !b.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (s === subject && b === body) return done(false);
    if (await save({ subject: s, body: b })) done(true);
  }

  return (
    <form className="stg-biz-editor" onSubmit={submit} aria-labelledby={labelId}>
      <Tokens target={() => last.current} />
      <label className="stg-field">
        <span className="stg-field-label">Subject</span>
        <input
          className="stg-input"
          value={s}
          maxLength={200}
          autoFocus
          onFocus={(e) => (last.current = e.currentTarget)}
          onChange={(e) => setS(e.target.value)}
          onKeyDown={escapeCloses(done)}
        />
      </label>
      <label className="stg-field">
        <span className="stg-field-label">Message</span>
        <textarea
          className="stg-input stg-textarea"
          rows={8}
          maxLength={5000}
          value={b}
          onFocus={(e) => (last.current = e.currentTarget)}
          onChange={(e) => setB(e.target.value)}
          onKeyDown={escapeCloses(done)}
        />
      </label>
      {blank && (
        <span className="stg-field-hint">It needs a subject and a message.</span>
      )}
      <EditorActions saving={saving} canSave={!blank} onCancel={() => done(false)} error={error} />
    </form>
  );
}

function ClosedEditor({
  labelId,
  body,
  onSaved,
  done,
}: {
  labelId: string;
  body: string;
  onSaved: OnSaved;
  done: Done;
}) {
  const [b, setB] = useState(body);
  const ref = useRef<HTMLTextAreaElement>(null);
  const { save, saving, error } = useAutoReplySave(onSaved);
  const hintId = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (b === body) return done(false);
    // "" clears it: the route stores null, and the main message is used.
    if (await save({ outOfHoursBody: b })) done(true);
  }

  return (
    <form className="stg-biz-editor" onSubmit={submit}>
      <Tokens target={() => ref.current} />
      <textarea
        ref={ref}
        className="stg-input stg-textarea"
        rows={6}
        maxLength={5000}
        autoFocus
        aria-labelledby={labelId}
        aria-describedby={hintId}
        placeholder="Leave empty to send the same message at all hours."
        value={b}
        onChange={(e) => setB(e.target.value)}
        onKeyDown={escapeCloses(done)}
      />
      <span className="stg-field-hint" id={hintId}>
        Sent instead of your main message when someone writes while you’re closed.
      </span>
      {!b.trim() && (
        <button
          type="button"
          className="stg-biz-more"
          onClick={() => setB(DEFAULT_OUT_OF_HOURS_BODY)}
        >
          Use a suggested message
        </button>
      )}
      <EditorActions saving={saving} onCancel={() => done(false)} error={error} />
    </form>
  );
}

function TeammateEditor({
  labelId,
  skip,
  onSaved,
  done,
}: {
  labelId: string;
  skip: boolean;
  onSaved: OnSaved;
  done: Done;
}) {
  const [choice, setChoice] = useState(skip);
  const { save, saving, error } = useAutoReplySave(onSaved);
  const name = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (choice === skip) return done(false);
    if (await save({ skipIfTeammateReplied: choice })) done(true);
  }

  return (
    <form className="stg-biz-editor" onSubmit={submit}>
      <fieldset className="stg-biz-choices" aria-labelledby={labelId}>
        {[
          { value: true, label: "Don’t send one — they’ve already been answered" },
          { value: false, label: "Send one anyway" },
        ].map((o) => (
          <label className="stg-biz-choice" key={String(o.value)}>
            <input
              type="radio"
              name={name}
              checked={choice === o.value}
              autoFocus={choice === o.value}
              onChange={() => setChoice(o.value)}
              onKeyDown={escapeCloses(done)}
            />
            <span className="stg-biz-choice-label">{o.label}</span>
          </label>
        ))}
      </fieldset>
      <EditorActions saving={saving} onCancel={() => done(false)} error={error} />
    </form>
  );
}

/** The loop guards, in words. Matches lib/auto-reply-guards.ts. */
function NeverSentTo({ done }: { done: Done }) {
  return (
    <div className="stg-biz-editor">
      <ul className="stg-biz-guards">
        <li>Postbox’s own sending, inbound and reply addresses.</li>
        <li>
          <code>noreply@</code>, <code>mailer-daemon@</code>, <code>postmaster@</code>{" "}
          and other role or bounce addresses.
        </li>
        <li>
          Mailing lists and other auto-responders (mail marked{" "}
          <code>Auto-Submitted</code>, <code>Precedence: bulk</code> or with a{" "}
          <code>List-</code> header).
        </li>
        <li>A conversation you’ve already replied to.</li>
        <li>The same address more than once in ten minutes, or three times an hour.</li>
      </ul>
      <div className="stg-biz-actions">
        <button
          type="button"
          className="stg-button stg-button--secondary"
          autoFocus
          onKeyDown={escapeCloses(done)}
          onClick={() => done(false)}
        >
          Hide the list
        </button>
      </div>
    </div>
  );
}

/** What the customer receives, rendered with the send path's own functions. */
function Preview({
  config,
  workspaceName,
}: {
  config: AutoReplyConfig;
  workspaceName: string;
}) {
  const [named, setNamed] = useState(true);
  const [closed, setClosed] = useState(false);
  const closedAvailable =
    config.scheduleMode !== "business_hours" && !!config.outOfHoursBody?.trim();

  const values = buildMergeValues({
    customerName: named ? "alex fenton" : "",
    customerEmail: "alex@example.com",
    formName: null,
    source: "contact_form",
    workspaceName,
  });
  const bodyTemplate =
    closed && closedAvailable ? config.outOfHoursBody! : config.body;

  return (
    <div className="stg-biz-preview">
      <div className="stg-biz-tokens" role="group" aria-label="Preview as">
        <button type="button" className="stg-biz-token" aria-pressed={named} onClick={() => setNamed(true)}>
          Name known
        </button>
        <button type="button" className="stg-biz-token" aria-pressed={!named} onClick={() => setNamed(false)}>
          No name
        </button>
        {closedAvailable && (
          <button
            type="button"
            className="stg-biz-token"
            aria-pressed={closed}
            onClick={() => setClosed((v) => !v)}
          >
            While closed
          </button>
        )}
      </div>
      <div className="st-email">
        <div className="st-email-head">
          <div className="st-email-row">
            <span className="st-email-key">From</span>
            <span className="st-email-val">{workspaceName}</span>
          </div>
          <div className="st-email-row">
            <span className="st-email-key">To</span>
            <span className="st-email-val">
              {named ? "Alex Fenton " : ""}&lt;alex@example.com&gt;
            </span>
          </div>
          <div className="st-email-row">
            <span className="st-email-key">Subject</span>
            <span className="st-email-val st-email-subject">
              {renderTemplate(config.subject, values) || "(no subject)"}
            </span>
          </div>
        </div>
        <div className="st-email-body">{renderTemplate(bodyTemplate, values)}</div>
      </div>
    </div>
  );
}
