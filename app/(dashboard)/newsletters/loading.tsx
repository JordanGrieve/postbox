import "../../newsletter.css";
import "../../skeleton.css";

/**
 * /newsletters — the overview (19 Nov 2026).
 *
 * Every box wears the real .nl-ov-* / .pbm-tabs class and skeleton.css only
 * paints a fill over it, so the column, the tiles, the tabs and the row
 * padding are declared once, in app/newsletter.css, and this cannot drift
 * from the page it stands in for. Only bar widths are inline.
 */
export default function NewslettersLoading() {
  return (
    <div className="pbm-page pb-scroll">
      <div className="nl-overview pbk" aria-busy="true" aria-label="Loading newsletters">
        <header className="nl-ov-head" aria-hidden>
          <div>
            <div className="nl-ov-title pbk-text" style={{ width: 140 }}>
              &nbsp;
            </div>
            <div className="nl-ov-sub pbk-text" style={{ width: 320, maxWidth: "100%" }}>
              &nbsp;
            </div>
          </div>
          <div className="pbk-fill" style={{ width: 168, height: 44, borderRadius: 10 }} />
        </header>

        <div className="nl-ov-tiles" aria-hidden>
          {[0, 1].map((i) => (
            <div className="nl-ov-tile pbk-fill" key={i}>
              <div className="nl-ov-tile-label">&nbsp;</div>
              <div className="nl-ov-tile-value">&nbsp;</div>
            </div>
          ))}
        </div>

        <div className="pbm-tabs nl-ov-tabs pbk-fill" aria-hidden>
          <span className="pbm-tab">&nbsp;</span>
          <span className="pbm-tab">&nbsp;</span>
        </div>

        <ul className="nl-ov-list" aria-hidden>
          {[180, 220, 150, 200].map((w, i) => (
            <li className="nl-ov-row" key={i}>
              <div className="nl-ov-row-text">
                <div className="nl-ov-row-name pbk-text" style={{ width: w, maxWidth: "100%" }}>
                  &nbsp;
                </div>
                <div className="nl-ov-row-meta pbk-text" style={{ width: w - 40 }}>
                  &nbsp;
                </div>
              </div>
              <div className="pbk-fill nl-ov-act" style={{ width: 96, height: 44, borderRadius: 10 }} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
