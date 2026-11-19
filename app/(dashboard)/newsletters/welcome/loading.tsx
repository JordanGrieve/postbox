import "../../../skeleton.css";
import "../../../settings.css";
import "../../../newsletter.css";

/**
 * /newsletters/welcome.
 *
 * Wears the real .nw-* classes, so the header, the two columns, their padding
 * and the bar at the bottom are declared once, in app/newsletter.css, and
 * this cannot drift from the screen it stands in for. Only bar widths and
 * the heights of boxes with no fixed height (the message, the preview) are
 * inline.
 */
export default function WelcomeNewsletterLoading() {
  return (
    <div className="pbm-page pb-scroll pbk" aria-busy="true" aria-label="Loading the welcome email">
      <div className="nw" aria-hidden>
        <header className="nw-head">
          <div className="nw-back">
            <span className="pbk-text" style={{ width: 96 }}>
              &nbsp;
            </span>
          </div>
          <div className="nw-head-row">
            <div className="nw-head-text">
              <div className="nw-title pbk-text" style={{ width: 168 }}>
                &nbsp;
              </div>
              <div className="nw-sub pbk-text" style={{ width: 300, maxWidth: "100%" }}>
                &nbsp;
              </div>
            </div>
            <div className="pbk-fill" style={{ width: 236, height: 44, borderRadius: 12 }} />
          </div>
        </header>

        <div className="nw-body">
          <div className="nw-form">
            {[44, 180].map((h, i) => (
              <div className="nw-field" key={i}>
                <span className="nw-label pbk-text" style={{ width: i ? 72 : 60 }}>
                  &nbsp;
                </span>
                <span className="pbk-fill" style={{ height: h, borderRadius: 10 }} />
              </div>
            ))}
            <div className="nw-field">
              <span className="nw-label pbk-text" style={{ width: 40 }}>
                &nbsp;
              </span>
              <div className="nw-looks">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="pbk-fill" style={{ height: 124, borderRadius: 14 }} />
                ))}
              </div>
            </div>
            <span className="pbk-fill" style={{ height: 96, borderRadius: 14 }} />
          </div>

          <div className="nw-preview">
            <div className="nw-preview-head">
              <span className="nw-preview-title pbk-text" style={{ width: 120 }}>
                &nbsp;
              </span>
              <span className="pbk-fill" style={{ width: 160, height: 44, borderRadius: 12 }} />
            </div>
            <span className="pbk-fill" style={{ display: "block", height: 700, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
