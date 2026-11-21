import "../../../subscribers.css";
import "../../../skeleton.css";

/**
 * /subscribers/[id].
 *
 * Deliberately shows NO banner-shaped block. The detail page's first element is
 * the consent verdict, in red, amber or green, and a coloured placeholder in
 * its position would flash a verdict this page does not yet know — on the one
 * screen in the product where a wrong-coloured box is a claim about the law.
 * The status chip is drawn, but as a neutral fill with no data-status, for the
 * same reason.
 *
 * Below that, the three cards every subscriber has, as the page draws them:
 * Consent evidence (a note, then four facts), Subscription (four facts, no
 * note) and Lists (a row of list chips). The Suppressed card only appears for
 * a suppressed address and is left out. (Until 21 Nov 2026 this drew two
 * cards, both with notes.)
 *
 * Everything follows the usual rule: real .psb-* classes, fills painted over
 * them by skeleton.css, no geometry restated.
 */
function Facts({ rows }: { rows: number }) {
  return (
    <dl className="psb-facts">
      {Array.from({ length: rows }, (_, i) => (
        <div style={{ display: "contents" }} key={i}>
          <dt className="psb-fact-k pbk-text" style={{ width: 96 }}>
            &nbsp;
          </dt>
          <dd className="psb-fact-v pbk-text" style={{ width: 180 + i * 22, maxWidth: "100%" }}>
            &nbsp;
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function SubscriberDetailLoading() {
  return (
    <div className="pbm-page pb-scroll">
      <div className="psb-wrap pbk" aria-busy="true" aria-label="Loading subscriber">
        <div className="psb-col" aria-hidden>
          <span className="psb-back pbk-text" style={{ width: 118 }}>
            &nbsp;
          </span>

          <header className="psb-identity">
            <span className="psb-avatar pbk-fill" />
            <span className="psb-identity-text">
              <span className="psb-identity-email pbk-text" style={{ width: 244 }}>
                &nbsp;
              </span>
              <span className="psb-identity-name pbk-text" style={{ width: 132 }}>
                &nbsp;
              </span>
            </span>
            <span className="psb-chip pbk-fill" style={{ width: 84 }}>
              &nbsp;
            </span>
          </header>

          <section className="psb-card">
            <div className="psb-card-title pbk-text" style={{ width: 152 }}>
              &nbsp;
            </div>
            <div className="psb-card-note pbk-text" style={{ width: 300, maxWidth: "100%" }}>
              &nbsp;
            </div>
            <Facts rows={4} />
          </section>

          <section className="psb-card">
            <div className="psb-card-title pbk-text" style={{ width: 112 }}>
              &nbsp;
            </div>
            <Facts rows={4} />
          </section>

          <section className="psb-card">
            <div className="psb-card-title pbk-text" style={{ width: 56 }}>
              &nbsp;
            </div>
            <div className="psb-chips">
              {[96, 128].map((w, i) => (
                <span className="psb-listchip pbk-fill" style={{ width: w }} key={i}>
                  &nbsp;
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
