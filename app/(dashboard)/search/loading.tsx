import "../../skeleton.css";

/**
 * /search — the results pane while the four queries run.
 *
 * Renders where the page's children render: inside `<main class="pb-main
 * pbm-main">`, which mail.css lays out as a flex ROW. /search puts one
 * full-width pane there, so this is that one pane and nothing else.
 *
 * Every box carries its real class, so the padding, radii and row gap come
 * from mail.css and cannot drift from the real results.
 *
 * The search box is drawn as its fixed 42px shell, so the results below it
 * start where the real ones will. Group headers are left out: how many groups
 * come back is exactly what we do not know yet, and inventing three of them
 * would be inventing a shape of result.
 *
 * Each result is the ticket shape, the first group the page renders: title
 * and time, who it is from, then the chips row (source, reference).
 */
export default function SearchLoading() {
  return (
    <section className="pbm-results pbk" role="status" aria-busy="true" aria-label="Searching">
      <div className="pbm-results-head" aria-hidden>
        <div className="pbm-search pbm-search--go">
          <span
            className="pbm-search-icon pbk-fill"
            style={{ width: 16, height: 16, borderRadius: 5 }}
          />
          <span
            className="pbm-search-input pbk-text pbk-text--fixed"
            style={{ width: 172 }}
          >
            &nbsp;
          </span>
        </div>
        <p className="pbm-results-meta pbk-text" style={{ width: 108 }}>
          &nbsp;
        </p>
      </div>

      <div className="pbm-results-scroll pb-scroll">
        <div className="pbm-group">
          <div className="pbm-group-body" aria-hidden>
            {[
              { title: "62%", line: "38%" },
              { title: "48%", line: "44%" },
              { title: "71%", line: "31%" },
              { title: "55%", line: "40%" },
            ].map((r, i) => (
              <div className="pbm-result" key={i}>
                <div className="pbm-result-top">
                  <span className="pbm-result-title pbk-text" style={{ width: r.title }}>
                    &nbsp;
                  </span>
                  <span
                    className="pbm-result-time pbk-text pbk-text--fixed"
                    style={{ width: 28 }}
                  >
                    &nbsp;
                  </span>
                </div>
                <div className="pbm-result-line pbk-text" style={{ width: r.line }}>
                  &nbsp;
                </div>
                <div className="pbm-result-chips">
                  {[64, 58].map((w, j) => (
                    <span
                      key={j}
                      className="pbm-tag pbk-text pbk-text--fixed"
                      style={{ width: w }}
                    >
                      &nbsp;
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
