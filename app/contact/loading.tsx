import { MarketingNavSkeleton } from "@/components/skeletons/MarketingSkeleton";
import "../home.css";
import "./contact.css";
import "../skeleton.css";

/**
 * The contact page.
 *
 * force-dynamic, so it is rendered per request — see the note in
 * app/contact/page.tsx for why it must not be prerendered. It wears the
 * page's classes: the 620px `.ct-col` inside `.ct-wrap`, the one-line title,
 * the lede, and the form — name, email, subject, message, Send, small print.
 * (With the key unset the page shows a notice instead of the form; the form
 * is the state that ships.)
 *
 * Until 21 Nov 2026 this was the homepage's 1080px hero shape with two title
 * bars, so the form changed width and position when the page arrived.
 */
export default function Loading() {
  return (
    <div className="home pbk" aria-busy="true" aria-label="Loading the contact form">
      <div aria-hidden style={{ display: "contents" }}>
        <MarketingNavSkeleton />
        <main className="ct-wrap">
          <div className="ct-col">
            <div className="ct-title pbk-text" style={{ width: 230 }}>
              &nbsp;
            </div>
            <div className="ct-lede">
              {["100%", "100%", "46%"].map((w, i) => (
                <div key={i} className="pbk-text" style={{ width: w, marginTop: i ? 6 : 0 }}>
                  &nbsp;
                </div>
              ))}
            </div>
            <div className="ct-form">
              {[76, 104, 72, 70].map((w, i) => (
                <div className="ct-field" key={i}>
                  <div className="ct-label pbk-text" style={{ width: w }}>
                    &nbsp;
                  </div>
                  <div className={i === 3 ? "ct-input ct-textarea pbk-fill" : "ct-input pbk-fill"}>
                    &nbsp;
                  </div>
                </div>
              ))}
              <div className="ct-button pbk-fill" style={{ width: 92 }}>
                &nbsp;
              </div>
              <div className="ct-fine pbk-text" style={{ width: "86%" }}>
                &nbsp;
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
