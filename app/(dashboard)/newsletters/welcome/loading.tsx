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
 * inline. The products editor and the bar were missing until 21 Nov 2026,
 * although this comment already claimed the bar.
 */
export default function WelcomeNewsletterLoading() {
  return (
    <div className="pbm-page pb-scroll pbk" aria-busy="true" aria-label="Loading the welcome email">
      <div className="nw" aria-hidden>
        <header className="nw-head">
          {/* The real button's classes, so it is the button's size and the
              header does not move when the form arrives. */}
          <div className="stg-button stg-button--secondary nw-back pbk-fill" style={{ width: 113 }}>
            &nbsp;
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
            {/* Heights measured off the welcome harness at 1280px, 21 Nov 2026. */}
            <div className="nw-field">
              <span className="nw-label pbk-text" style={{ width: 60 }}>
                &nbsp;
              </span>
              <span className="pbk-fill" style={{ height: 44, borderRadius: 10 }} />
            </div>
            <div className="nw-field">
              <span className="nw-label pbk-text" style={{ width: 72 }}>
                &nbsp;
              </span>
              <span className="pbk-fill" style={{ height: 246, borderRadius: 10 }} />
              {/* "Insert:" and its two merge-tag chips. */}
              <div className="nw-insert">
                {[120, 128].map((w, i) => (
                  <span key={i} className="pbk-fill" style={{ width: w, height: 32, borderRadius: 10 }} />
                ))}
              </div>
            </div>
            <div className="nw-field">
              <span className="nw-label pbk-text" style={{ width: 40 }}>
                &nbsp;
              </span>
              <div className="nw-looks">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="pbk-fill" style={{ height: 156, borderRadius: 14 }} />
                ))}
              </div>
            </div>
            {/* The picture box, then the products editor: label and add button. */}
            <div className="nw-field">
              <span className="nw-label pbk-text" style={{ width: 96 }}>
                &nbsp;
              </span>
              <span className="pbk-fill" style={{ height: 132, borderRadius: 14 }} />
            </div>
            <div className="nw-products">
              <span className="pbk-text" style={{ width: 120, marginBottom: 8 }}>
                &nbsp;
              </span>
              <span
                className="stg-button stg-button--secondary pbk-fill"
                style={{ display: "block", width: 120 }}
              />
            </div>
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

        {/* The sticky bar: a status line, then Send me a test and Save. */}
        <footer className="nw-bar">
          <span className="nw-bar-status pbk-text" style={{ width: 180 }}>
            &nbsp;
          </span>
          <div className="nw-bar-actions">
            <span className="stg-button stg-button--secondary pbk-fill" style={{ width: 136 }} />
            <span className="stg-button pbk-fill" style={{ width: 120 }} />
          </div>
        </footer>
      </div>
    </div>
  );
}
