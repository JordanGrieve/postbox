import Link from "next/link";

/**
 * The parts of a redesigned settings page that are just markup: the page
 * header, a section heading, and a row that shows a fact and, at most, links
 * somewhere. Server-safe — no "use client" — so the pages that are mostly
 * facts (Website & email, Billing) stay server components.
 *
 * Interactive rows use SettingRow (./SettingRow.tsx); both share the
 * .stg-biz-* classes, so the two kinds sit in one list without a seam.
 */

export function SettingsHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="stg-head">
      <p className="stg-eyebrow">Settings</p>
      <h1 className="stg-title">{title}</h1>
      <p className="stg-sub">{sub}</p>
    </header>
  );
}

/** "WHEN IT SENDS", "YOUR PLAN", … — a small heading over a group of rows. */
export function RowGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="stg-biz-group">
      <h2 className="stg-biz-heading">{title}</h2>
      <dl className="stg-biz">{children}</dl>
    </section>
  );
}

export function InfoRow({
  label,
  value,
  note,
  warn = false,
  mono = false,
  empty = false,
  action,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  /** The note is a consequence to act on, not context. */
  warn?: boolean;
  mono?: boolean;
  empty?: boolean;
  /** A link, or a client island (Copy, Close workspace). */
  action?: React.ReactNode;
}) {
  return (
    <div className="stg-biz-row">
      <dt className="stg-biz-label">{label}</dt>
      <dd className="stg-biz-body">
        <span
          className={[
            "stg-biz-value",
            mono ? "stg-biz-mono" : "",
            empty ? "stg-biz-value--empty" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {value}
        </span>
        {note && (
          <span className={warn ? "stg-biz-note" : "stg-biz-note stg-biz-note--quiet"}>
            {note}
          </span>
        )}
      </dd>
      {action && <dd className="stg-biz-side">{action}</dd>}
    </div>
  );
}

/**
 * A row action that goes somewhere. `label` is the accessible name and must
 * start with the visible `children` (2.5.3).
 */
export function RowLink({
  href,
  label,
  children,
  danger = false,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Link prefetch={false}
      href={href}
      className={danger ? "stg-biz-action stg-biz-action--danger" : "stg-biz-action"}
      aria-label={label}
    >
      {children}
    </Link>
  );
}
