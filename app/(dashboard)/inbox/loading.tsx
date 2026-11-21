import "../../skeleton.css";

/**
 * /inbox — the two-pane mail skeleton.
 *
 * This used to be (dashboard)/loading.tsx, doubling as the generic dashboard
 * fallback. It moved down here when the thread route was split into slots: the
 * only route left leaning on the parent fallback is /tickets/[id], whose cold
 * load wants a THREE-pane skeleton and wants the list hidden on mobile —
 * neither of which is right for /inbox. See ../loading.tsx.
 *
 * This renders where the page's children render: inside `<main class="pb-main
 * pbm-main">`, which mail.css lays out as a flex ROW. So the skeleton is a
 * fragment of sibling panes, exactly like inbox/page.tsx — a wrapper div would
 * collapse the two panes into one column and shift the whole screen.
 *
 * Every box below carries its real class, so the 336px list width, the 18px
 * card radius, the 13px card padding and the 6px row gap all come from
 * mail.css and cannot drift from the real list.
 *
 * The right-hand pane is deliberately EMPTY. On /inbox it is either a static
 * "No thread open" message or, while setup is unfinished, the onboarding
 * checklist (inbox/page.tsx). Which one is not known until the page runs, so
 * a shimmering fake of either would be a guess that is wrong half the time;
 * an empty pane is right for both.
 */
export default function DashboardLoading() {
  return (
    <>
      <MailListSkeleton />
      <section
        className="pbm-thread pbm-thread--empty"
        data-hide-mobile
        aria-hidden
      />
    </>
  );
}

/**
 * Widths only — every height is inherited from mail.css. Varied on purpose so
 * the pane reads as a stack of messages rather than a table.
 */
const CARDS = [
  { name: 118, time: 30, preview: "64%", from: 92 },
  { name: 146, time: 38, preview: "83%", from: 104 },
  { name: 96, time: 34, preview: "58%", from: 92 },
  { name: 132, time: 30, preview: "76%", from: 118 },
  { name: 108, time: 42, preview: "61%", from: 92 },
  { name: 152, time: 32, preview: "80%", from: 104 },
];

/** The simple inbox's list (18 Nov 2026): title, two tabs, search, cards. */
function MailListSkeleton() {
  return (
    <section
      className="pbm-list pbk"
      role="status" aria-busy="true"
      aria-label="Loading messages"
    >
      <div className="pbm-list-head" aria-hidden>
        <span className="pbm-list-title pbk-text" style={{ width: 72 }}>
          &nbsp;
        </span>
        <div className="pbm-tabs">
          <span className="pbm-tab pbk-fill" />
          <span className="pbm-tab pbk-fill" />
        </div>
        {/* .pbm-search is a fixed 42px box, so nothing inside it can shift. */}
        <div className="pbm-search">
          <span
            className="pbm-search-icon pbk-fill"
            style={{ width: 16, height: 16, borderRadius: 5 }}
          />
          <span
            className="pbm-search-input pbk-text pbk-text--fixed"
            style={{ width: 128 }}
          >
            &nbsp;
          </span>
        </div>
      </div>

      <div className="pbm-list-scroll">
        {CARDS.map((c, i) => (
          <div className="pbm-card" key={i} aria-hidden>
            <div className="pbm-card-top">
              <span
                className="pbm-card-name pbk-text pbk-text--fixed"
                style={{ width: c.name }}
              >
                &nbsp;
              </span>
              <span
                className="pbm-card-time pbk-text pbk-text--fixed"
                style={{ width: c.time }}
              >
                &nbsp;
              </span>
            </div>
            {/* Two lines, as the real preview clamps to. */}
            <div className="pbm-card-preview pbk-text" style={{ width: "92%" }}>
              &nbsp;
            </div>
            <div className="pbm-card-preview pbk-text" style={{ width: c.preview }}>
              &nbsp;
            </div>
            <div className="pbm-card-from pbk-text" style={{ width: c.from }}>
              &nbsp;
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
