import "../../app/skeleton.css";

/**
 * The skeleton for a settings page built as read-then-Change rows: Your
 * business and Notifications (20 Nov 2026 design).
 *
 * Wears the real classes from settings.css — .stg-wrap, .stg-head, .stg-biz and
 * its rows — so the eyebrow, title, row dividers and the Change column land
 * exactly where the page will, and nothing jumps when it swaps in. Row values
 * are one bar each: their real length depends on what the client typed.
 */
export default function SettingsRowsSkeleton({
  label,
  titleWidth,
  rows,
}: {
  label: string;
  titleWidth: number;
  /** Width of each row's value bar, in px. One entry per row. */
  rows: number[];
}) {
  return (
    <div className="stg-wrap pbk" aria-busy="true" aria-label={label}>
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

      <div className="stg-biz" aria-hidden>
        {rows.map((w, i) => (
          <div className="stg-biz-row" key={i}>
            <div className="stg-biz-label pbk-text" style={{ width: 96 }}>
              &nbsp;
            </div>
            <div className="stg-biz-body">
              <span className="stg-biz-value pbk-text" style={{ width: w, maxWidth: "100%" }}>
                &nbsp;
              </span>
            </div>
            <div className="stg-biz-side">
              <span className="stg-biz-action pbk-text" style={{ width: 52 }}>
                &nbsp;
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
