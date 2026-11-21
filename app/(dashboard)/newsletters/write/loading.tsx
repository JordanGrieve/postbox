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
        role="status" aria-busy="true"
        aria-label="Loading the newsletter"
      >
        <div className="nl-main" aria-hidden>
          {/* "← Newsletters" above the title, as the composer draws it with
              no rail; there is no subtitle (this drew one until 21 Nov 2026). */}
          <header className="nl-head">
            <div className="nl-head-text" style={{ flex: 1 }}>
              {/* The link's 44px box, with a text-height bar inside it. */}
              <span className="nl-back">
                <span className="pbk-text" style={{ width: 112 }}>
                  &nbsp;
                </span>
              </span>
              <div className="nl-title pbk-text" style={{ width: 168 }}>
                &nbsp;
              </div>
            </div>
            <div className="pbk-fill" style={{ width: 116, height: 40, borderRadius: 12 }} />
          </header>

          {/* A new campaign: Start from, The email, Body and Audience on the
              left; the preview, recipients and schedule on the right. Heights
              measured off the composer harness at 1280px, 21 Nov 2026. */}
          <div className="nl-grid">
            <div className="nl-col">
              <div className="pbk-fill" style={{ height: 146, borderRadius: 18 }} />
              <div className="pbk-fill" style={{ height: 564, borderRadius: 18 }} />
              <div className="pbk-fill" style={{ height: 550, borderRadius: 18 }} />
              <div className="pbk-fill" style={{ height: 120, borderRadius: 18 }} />
            </div>
            <div className="nl-col">
              <div className="pbk-fill" style={{ height: 812, borderRadius: 18 }} />
              <div className="pbk-fill" style={{ height: 146, borderRadius: 18 }} />
              <div className="pbk-fill" style={{ height: 400, borderRadius: 18 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
