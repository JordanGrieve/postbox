import "../../app/home.css";
import "../../app/skeleton.css";

/**
 * The placeholder for the marketing homepage, and the nav every public
 * marketing page shares (MarketingNavSkeleton, used by /pricing and /contact).
 *
 * ── IT WEARS THE PAGE'S OWN CLASSES ──
 * `.home`, `.home-nav`, `.home-hero`, `.home-hero-inner`, `.home-lede`,
 * `.home-cta-row` and `.home-shot` carry the page's ground, padding, column,
 * band and spacing, so the placeholder sits exactly where the real content
 * will. Bars drawn inside boxes of this file's own invention land a few
 * pixels off and shift as the page arrives, which is the one thing a skeleton
 * exists to prevent.
 *
 * Until 21 Nov 2026 the hero here was plain bars in `.home-wrap` with no band,
 * while the real hero is a rounded dark `.home-hero` band with an eyebrow pill
 * and a button row — so the band appeared from nowhere when the page arrived.
 * /pricing and /contact used this too, and neither has a hero at all; they
 * have their own shapes now.
 */

/** The marketing nav: lockup on the left, three links and Sign in. */
export function MarketingNavSkeleton() {
  return (
    <div className="home-nav">
      <div className="pbk-text" style={{ width: 108, height: 20 }}>
        &nbsp;
      </div>
      <div className="home-nav-links">
        {/* The links hide on a phone in the real nav; so do these. The bar
            sits INSIDE the link box: on the box itself, .pbk .pbk-text's
            display: block outranked the hide-sm rule and they stayed. */}
        {[42, 36, 40].map((w, i) => (
          <div key={i} className="home-nav-link home-nav-link--hide-sm">
            <div className="pbk-text" style={{ width: w }}>
              &nbsp;
            </div>
          </div>
        ))}
        {/* A fixed width: the phone rule's `.home-btn { width: 100% }`
            would otherwise push it 100px off the screen. */}
        <div
          className="home-btn home-btn--sm pbk-fill"
          style={{ width: 78, padding: 0 }}
        />
      </div>
    </div>
  );
}

export default function MarketingSkeleton({
  label,
  lines = 3,
  block = 280,
}: {
  label: string;
  /** Lines of the lede under the headline. */
  lines?: number;
  /** Height of the product shot's placeholder, or 0 for none. */
  block?: number;
}) {
  return (
    <div className="home pbk" aria-busy="true" aria-label={label}>
      <div aria-hidden style={{ display: "contents" }}>
        <MarketingNavSkeleton />

        <main style={{ flex: 1 }}>
          <section className="home-hero">
            <div className="home-hero-inner">
              <div className="home-eyebrow pbk-fill" style={{ width: 230 }}>
                &nbsp;
              </div>
              {/* On a phone the real headline wraps to three lines and the
                  lede to two more than on desktop, so the narrow-only bars
                  add them there and the wide-only ones keep desktop's short
                  last line (skeleton.css, 21 Nov 2026). */}
              <div className="home-h1" style={{ marginBottom: 20 }}>
                <div className="pbk-text" style={{ width: "92%" }}>
                  &nbsp;
                </div>
                <div className="pbk-text pbk-wide-only" style={{ width: "64%", marginTop: 6 }}>
                  &nbsp;
                </div>
                <div className="pbk-text pbk-narrow-only" style={{ width: "100%", marginTop: 6 }}>
                  &nbsp;
                </div>
                <div className="pbk-text pbk-narrow-only" style={{ width: "60%", marginTop: 6 }}>
                  &nbsp;
                </div>
              </div>
              <div className="home-lede">
                {Array.from({ length: lines - 1 }, (_, i) => (
                  <div key={i} className="pbk-text" style={{ width: "100%", marginTop: i ? 6 : 0 }}>
                    &nbsp;
                  </div>
                ))}
                <div className="pbk-text pbk-wide-only" style={{ width: "58%", marginTop: 6 }}>
                  &nbsp;
                </div>
                {["100%", "100%", "58%"].map((w, i) => (
                  <div key={i} className="pbk-text pbk-narrow-only" style={{ width: w, marginTop: 6 }}>
                    &nbsp;
                  </div>
                ))}
              </div>
              <div className="home-cta-row">
                <div className="home-btn pbk-fill" style={{ minWidth: 168 }} />
                <div className="home-btn pbk-fill" style={{ minWidth: 132 }} />
              </div>
              <div className="home-cta-note pbk-text" style={{ width: 190 }}>
                &nbsp;
              </div>
            </div>
            {block ? (
              <div className="home-shot">
                <div className="pbk-fill" style={{ height: block, borderRadius: 20 }} />
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
