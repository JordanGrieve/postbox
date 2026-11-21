import "../../../skeleton.css";

/**
 * /settings/team, as the page draws it: the title with "Add new member"
 * beside it, the "N people" heading over the member rows, and the Postbox
 * access group with its one row (the link to the access log).
 *
 * The rows have no right-hand block: the only thing the page puts there is a
 * Remove button, and only the owner sees it, on rows other than their own.
 * The "Add someone" notice is left out too; it only appears on a full plan.
 * (Until 21 Nov 2026 this drew a subtitle, a ticket-count pill on each row and
 * a 96px invite form, none of which the page had shown for some time.)
 */
export default function TeamLoading() {
  return (
    <div className="stg-wrap pbk" role="status" aria-busy="true" aria-label="Loading team">
      <header className="stg-head stg-head--action" aria-hidden>
        <div className="stg-title pbk-text" style={{ width: 68 }}>
          &nbsp;
        </div>
        <span className="stg-button pbk-fill" style={{ width: 150 }} />
      </header>

      <section className="stg-section" aria-hidden>
        <div className="stg-section-title pbk-text" style={{ width: 90 }}>
          &nbsp;
        </div>
        <ul className="stc-list">
          {[172, 204, 158].map((w, i) => (
            <li className="stc-row" key={i}>
              <span className="stc-avatar pbk-fill" />
              <span className="stc-person">
                <span className="stc-name pbk-text" style={{ width: w, maxWidth: "100%" }}>
                  &nbsp;
                </span>
                <span className="stc-email pbk-text" style={{ width: 120, maxWidth: "100%" }}>
                  &nbsp;
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="stg-biz-group" aria-hidden>
        <div className="stg-biz-heading pbk-text" style={{ width: 130 }}>
          &nbsp;
        </div>
        <div className="stg-biz">
          <div className="stg-biz-row">
            <div className="stg-biz-label pbk-text" style={{ width: 96 }}>
              &nbsp;
            </div>
            <div className="stg-biz-body">
              <span className="stg-biz-value pbk-text" style={{ width: 300, maxWidth: "100%" }}>
                &nbsp;
              </span>
            </div>
            <div className="stg-biz-side">
              <span className="stg-biz-action pbk-text" style={{ width: 52 }}>
                &nbsp;
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
