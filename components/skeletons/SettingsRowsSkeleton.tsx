import { Fragment } from "react";
import "../../app/skeleton.css";

/**
 * The skeleton for a settings page built as read-then-Change rows: Your
 * business, Auto-reply, Website & email and Billing (20 Nov 2026 designs).
 *
 * Wears the real classes from settings.css — .stg-wrap, .stg-head,
 * .stg-biz-group, .stg-biz-heading, .stg-biz and its rows — so the title, the
 * group headings, the row dividers and the Change column land exactly where
 * the page will, and nothing jumps when it swaps in.
 *
 * Laid out in GROUPS because the pages are: until 21 Nov 2026 this drew one
 * flat list, so on every page but Your business the headings ("Getting
 * messages in", "Your plan", …) appeared from nowhere and pushed the rows
 * down. A group with `heading: false` is a bare list (Your business has one).
 *
 * A row is the width of its value bar in px, or [value, note] when the real
 * row carries a note line under its value — the note is a second line, and
 * leaving it out made every such row grow on arrival. Widths are guesses:
 * the real length depends on what the client typed.
 */
export type SkeletonRow = number | readonly [value: number, note: number];

export type SkeletonGroup = {
  /** Width of the group's h2 bar, or false for a list with no heading. */
  heading: number | false;
  rows: readonly SkeletonRow[];
  /** Width of a link under the rows (Auto-reply's "Preview what customers get"). */
  more?: number;
};

export default function SettingsRowsSkeleton({
  label,
  titleWidth,
  groups,
  status = false,
}: {
  label: string;
  titleWidth: number;
  groups: readonly SkeletonGroup[];
  /** Auto-reply's on/off card, which sits above the first group. */
  status?: boolean;
}) {
  return (
    <div className="stg-wrap pbk" role="status" aria-busy="true" aria-label={label}>
      <header className="stg-head" aria-hidden>
        <div className="stg-eyebrow pbk-text" style={{ width: 56 }}>
          &nbsp;
        </div>
        <div className="stg-title pbk-text" style={{ width: titleWidth }}>
          &nbsp;
        </div>
        <div className="stg-sub pbk-text" style={{ width: "64%" }}>
          &nbsp;
        </div>
      </header>

      {status && (
        <div className="stg-biz-status" aria-hidden>
          <span className="stg-biz-status-dot pbk-fill" />
          <div className="stg-biz-status-text">
            <div className="stg-biz-status-title pbk-text" style={{ width: 150 }}>
              &nbsp;
            </div>
            <div className="stg-biz-status-sub pbk-text" style={{ width: "80%" }}>
              &nbsp;
            </div>
          </div>
          <span className="stg-button pbk-fill" style={{ width: 92 }} />
        </div>
      )}

      {groups.map((g, gi) => {
        const list = (
          <div className="stg-biz" aria-hidden>
            {g.rows.map((r, i) => {
              const [value, note] = typeof r === "number" ? [r, 0] : r;
              return (
                <div className="stg-biz-row" key={i}>
                  <div className="stg-biz-label pbk-text" style={{ width: 96 }}>
                    &nbsp;
                  </div>
                  <div className="stg-biz-body">
                    <span
                      className="stg-biz-value pbk-text"
                      style={{ width: value, maxWidth: "100%" }}
                    >
                      &nbsp;
                    </span>
                    {note > 0 && (
                      <span
                        className="stg-biz-note stg-biz-note--quiet pbk-text"
                        style={{ width: note, maxWidth: "100%" }}
                      >
                        &nbsp;
                      </span>
                    )}
                  </div>
                  <div className="stg-biz-side">
                    <span className="stg-biz-action pbk-text" style={{ width: 52 }}>
                      &nbsp;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
        // The page puts a bare list straight into .stg-wrap; so does this.
        if (g.heading === false) return <Fragment key={gi}>{list}</Fragment>;
        return (
          <div className="stg-biz-group" key={gi}>
            <div className="stg-biz-heading pbk-text" style={{ width: g.heading }} aria-hidden>
              &nbsp;
            </div>
            {list}
            {g.more && (
              <span className="stg-biz-more pbk-text" style={{ width: g.more }} aria-hidden>
                &nbsp;
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
