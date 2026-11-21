import { MarketingNavSkeleton } from "@/components/skeletons/MarketingSkeleton";
import "../home.css";
import "./pricing.css";
import "../skeleton.css";

/**
 * The pricing page.
 *
 * Prerendered, so this is the client-side navigation boundary rather than a
 * first-load one. It wears the page's classes: the centred `.prc-head` with
 * its "Pricing" kicker, title and subtext, then the `.prc-grid` of three
 * `.prc-card`s — name, tagline, price, button, five features.
 *
 * Until 21 Nov 2026 this was the homepage's left-aligned hero shape with one
 * 320px block, so the heading jumped to the centre when the page arrived.
 */
export default function Loading() {
  return (
    <div className="home pbk" aria-busy="true" aria-label="Loading pricing">
      <div aria-hidden style={{ display: "contents" }}>
        <MarketingNavSkeleton />
        <main style={{ flex: 1 }}>
          <section className="home-section home-wrap prc-head">
            <div className="home-kicker pbk-text" style={{ width: 64, margin: "0 auto 10px" }}>
              &nbsp;
            </div>
            <div
              className="home-h2 prc-title pbk-text"
              style={{ width: "80%", maxWidth: 620 }}
            >
              &nbsp;
            </div>
            <div className="home-sub prc-sub">
              <div className="pbk-text" style={{ width: "100%" }}>
                &nbsp;
              </div>
              <div className="pbk-text" style={{ width: "62%", margin: "6px auto 0" }}>
                &nbsp;
              </div>
            </div>
          </section>

          <section className="home-wrap">
            <div className="prc-grid">
              {[0, 1, 2].map((i) => (
                <div className="prc-card" key={i}>
                  <div className="prc-name pbk-text" style={{ width: 90 }}>
                    &nbsp;
                  </div>
                  <div className="prc-tagline pbk-text" style={{ width: "80%" }}>
                    &nbsp;
                  </div>
                  <div className="prc-price">
                    <span className="prc-amount pbk-text" style={{ width: 96 }}>
                      &nbsp;
                    </span>
                  </div>
                  <div className="home-btn prc-cta pbk-fill" />
                  <div className="prc-features">
                    {[88, 70, 80, 64, 40].map((w, j) => (
                      <div key={j} className="pbk-text" style={{ width: `${w}%` }}>
                        &nbsp;
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
