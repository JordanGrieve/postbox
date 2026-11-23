import Link from "next/link";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import JsonLd from "@/components/marketing/JsonLd";
import { GUIDES, type Guide } from "@/lib/guides";
import { faqJsonLd } from "@/lib/structured-data";
import { TRIAL_CTA, TRIAL_HREF, TRIAL_NOTE } from "@/lib/marketing-copy";
// home.css (the shared marketing furniture) is imported by each route, as
// pricing and contact do: components do not import from app/.
import "./guide.css";

/**
 * One guide page (lib/guides.ts): the answer first, then a comparison table
 * if there is one, the sections, the questions, a way to start, and links to
 * the other guides.
 *
 * The questions are open on the page, not folded into an accordion like the
 * pricing page's: they are the part search engines and AI assistants quote,
 * and text a reader has to click to see is text they weigh less.
 *
 * Static, like every public page: no request data, no loading.tsx above it.
 */
export default function GuidePage({ guide }: { guide: Guide }) {
  const others = GUIDES.filter((g) => g.path !== guide.path);
  return (
    <div className="home">
      <MarketingNav />

      <main style={{ flex: 1 }}>
        <section className="home-section home-wrap gd-head">
          <p className="home-kicker">{guide.kicker}</p>
          <h1 className="home-h2 gd-title">{guide.h1}</h1>
          <p className="home-sub gd-answer">{guide.answer}</p>
          <Link className="home-btn home-btn--primary" href={TRIAL_HREF}>
            {TRIAL_CTA}
          </Link>
          <p className="gd-note">{TRIAL_NOTE}</p>
        </section>

        {guide.comparison && (
          <section
            className="home-section home-wrap"
            aria-labelledby="gd-compare"
          >
            <h2 className="home-h2" id="gd-compare">
              Side by side
            </h2>
            <table className="gd-table">
              <thead>
                <tr>
                  <td />
                  <th scope="col">Postbox</th>
                  <th scope="col">{guide.comparison.them}</th>
                </tr>
              </thead>
              <tbody>
                {guide.comparison.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td data-col="Postbox">{row.postbox}</td>
                    <td data-col={guide.comparison?.them}>{row.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="gd-source">
              {guide.comparison.them}&rsquo;s figures checked in{" "}
              {guide.comparison.checked}, from{" "}
              <a href={guide.comparison.source.href} rel="noopener">
                {guide.comparison.source.label}
              </a>
              . Prices change; check theirs before you decide.
            </p>
          </section>
        )}

        {/* Two columns from laptop width (guide.css): each column keeps the
            46ch reading width, and the page uses the space beside it
            (Jordan, 23 Nov 2026: "using up the remaining space"). */}
        {guide.sections.length > 0 && (
          <div className="home-wrap gd-grid">
            {guide.sections.map((s) => (
              <section className="home-section gd-section" key={s.heading}>
                <h2 className="home-h2">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p className="gd-text" key={p}>
                    {p}
                  </p>
                ))}
                {s.points && (
                  <ul className="gd-points">
                    {s.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}

        <section
          className="home-section home-wrap gd-section"
          aria-labelledby="gd-faq"
        >
          <h2 className="home-h2" id="gd-faq">
            {guide.sections.length ? "Questions" : "Answers"}
          </h2>
          <div className="gd-faq">
            {guide.faq.map((item) => (
              <div className="gd-faq-item" key={item.q}>
                <h3 className="gd-faq-q">{item.q}</h3>
                <p className="gd-text">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section home-wrap" aria-labelledby="gd-more">
          <h2 className="home-h2" id="gd-more">
            More guides
          </h2>
          <ul className="gd-more">
            {others.map((g) => (
              <li key={g.path}>
                <Link href={g.path}>{g.title}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="home-section home-section--last home-wrap">
          <div className="home-band">
            <div>
              <h2 className="home-band-title">
                Try it with your own customers
              </h2>
              <p className="home-band-sub">
                Questions first? <Link href="/contact">Get in touch</Link> or
                see <Link href="/pricing">the plans</Link>.
              </p>
            </div>
            <Link className="home-btn home-btn--primary" href={TRIAL_HREF}>
              {TRIAL_CTA}
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
      <JsonLd data={faqJsonLd(guide.faq)} />
    </div>
  );
}
