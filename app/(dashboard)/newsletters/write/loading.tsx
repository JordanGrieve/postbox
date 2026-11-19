import "../../../skeleton.css";
import "../../../newsletter.css";

/**
 * /newsletters/write skeleton: the composer without its rail (the overview
 * at /newsletters is the list since 19 Nov 2026).
 *
 * Reuses the real .nl-* classes so the frame — card radii, page padding, the
 * two-up grid and its collapse points — is exact and nothing shifts when the
 * composer swaps in. Only the shapes inside the cards are approximated, and
 * only where their height is predictable.
 */
export default function WriteNewsletterLoading() {
  return (
    <div className="pbm-page pb-scroll">
      <div
        className="nl-wrap pbk"
        data-rail="off"
        aria-busy="true"
        aria-label="Loading the newsletter"
      >
        <div className="nl-main" aria-hidden>
          <header className="nl-head">
            <div className="nl-head-text" style={{ flex: 1 }}>
              <div className="nl-title pbk-text" style={{ width: 168 }}>
                &nbsp;
              </div>
              <div className="nl-sub pbk-text" style={{ width: "70%" }}>
                &nbsp;
              </div>
            </div>
            <div className="pbk-fill" style={{ width: 116, height: 40, borderRadius: 12 }} />
          </header>

          <div className="nl-grid">
            <div className="nl-col">
              <div className="pbk-fill" style={{ height: 372, borderRadius: 18 }} />
              <div className="pbk-fill" style={{ height: 330, borderRadius: 18 }} />
            </div>
            <div className="nl-col">
              <div className="pbk-fill" style={{ height: 700, borderRadius: 18 }} />
              <div className="pbk-fill" style={{ height: 260, borderRadius: 18 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
