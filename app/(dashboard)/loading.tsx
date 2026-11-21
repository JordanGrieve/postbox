import "../skeleton.css";

/**
 * The (dashboard) fallback, which in practice means one thing: the COLD load
 * of /tickets/[id].
 *
 * Every other route under (dashboard) ships its own closer loading.tsx —
 * /inbox, /search, /newsletters, /subscribers and every settings page — so
 * this file is reached only when someone opens a ticket URL directly, or
 * refreshes on one.
 *
 * It sits INSIDE the (dashboard) layout, so it only shows once that layout has
 * resolved the viewer and the mail counts. Before then the nearest boundary is
 * the root app/loading.tsx.
 *
 * WHY IT IS NOT REACHED ON NAVIGATION
 *
 * /tickets/[id] deliberately has no loading.tsx of its own; its conversation
 * pane is a parallel-route slot with its own boundary (see
 * tickets/[id]/layout.tsx). On a client-side navigation the segment can emit a
 * shell immediately, so Next never falls back this far — measured on 16.2.10,
 * both /inbox → /tickets/1 and /tickets/1 → /tickets/2. If you ever see the
 * whole screen skeleton on a row click again, something has started awaiting
 * at the top of tickets/[id]/page.tsx and this file is what you are looking at.
 *
 * WHY IT MIRRORS THE THREAD ROUTE AND NOT THE INBOX
 *
 * On a cold /tickets/5, once the layout is in, this is the boundary shown, and the
 * thread route is a three-column flex row: 336px list, conversation, 290px
 * rail. Drawing only two of the three here, or leaving the list visible on a
 * phone, would mean a jump the moment the real panes land.
 *
 *  · the list carries `data-hide-mobile`, exactly as the real route does
 *    (`<MessageList … hideOnMobile />`) — without it the phone would show the
 *    list skeleton and then swap to the thread;
 *  · the rail is `data-rail="auto"`, the same state Thread mounts it in, so it
 *    is a 290px column above 1180px and absent below it. Hardcoding "open"
 *    would put a 290px overlay across the thread on a tablet;
 *  · this renders where the page's children render: inside `<main class=
 *    "pb-main pbm-main">`, which mail.css lays out as a flex ROW. So it is a
 *    fragment of sibling panes — a wrapper div would collapse them into one
 *    column and shift the whole screen.
 *
 * The thread and rail markup is duplicated from tickets/[id]/@thread/
 * loading.tsx rather than shared. A loading.tsx is a route file, not a
 * component module, and this is markup, not logic — not worth exporting a
 * component out of a Next file convention for.
 *
 * Every box carries its real class, so the 336px list width, the 74px thread
 * header, the 18px card radius and the 6px row gap all come from mail.css and
 * cannot drift from the real panes.
 */
export default function DashboardLoading() {
  return (
    <>
      <MailListSkeleton />
      <ThreadSkeleton />
      <RailSkeleton />
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

function MailListSkeleton() {
  return (
    <section
      className="pbm-list pbk"
      data-hide-mobile
      aria-busy="true"
      aria-label="Loading messages"
    >
      <div className="pbm-list-head" aria-hidden>
        {/* The title and the To reply / Done tabs (18 Nov 2026). */}
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

/**
 * A bubble is a solid block in the real UI too, so it is drawn as one block
 * rather than as three stacked bars. The newlines are what give it its real
 * height: .pbm-bubble is `white-space: pre-wrap`, so each one is a genuine
 * 13.5px/1.55 line box.
 */
const NBSP = " ";
// px on the BUBBLE, not % on the wrap: see tickets/[id]/@thread/loading.tsx.
const BUBBLES: { out: boolean; lines: number; width: number }[] = [
  { out: false, lines: 3, width: 420 },
  { out: true, lines: 2, width: 340 },
  { out: false, lines: 2, width: 460 },
  { out: true, lines: 4, width: 380 },
];

function ThreadSkeleton() {
  return (
    <section
      className="pbm-thread pbk"
      aria-busy="true"
      aria-label="Loading conversation"
    >
      {/* 74px, fixed in mail.css — this header cannot shift. */}
      <header className="pbm-thread-head" aria-hidden>
        {/* The phone's back button; .pbm-back hides it on desktop. */}
        <span className="pbm-icon-btn pbm-back pbk-fill" />
        <div className="pbm-thread-who">
          <p className="pbm-thread-name pbk-text" style={{ width: 168 }}>
            &nbsp;
          </p>
          <p className="pbm-thread-email pbk-text" style={{ width: 208 }}>
            &nbsp;
          </p>
        </div>
        {/* Mark as done, then Details (18 Nov 2026). */}
        <div className="pbm-thread-actions">
          <span className="pbm-done-btn pbk-fill" style={{ width: 132 }} />
          <span className="pbm-icon-btn pbk-fill" />
        </div>
      </header>

      {/* No subject row: the thread dropped it on 19 Nov 2026 (Thread.tsx). */}
      <div className="pbm-transcript" aria-hidden>
        {BUBBLES.map((b, i) => (
          <div key={i} className="pbm-bubble-row" data-out={b.out || undefined}>
            <div className="pbm-bubble-wrap">
              {/* Who and when sit ABOVE the bubble, as in Thread.tsx. */}
              <p
                className="pbm-bubble-meta pbk-text"
                style={{ width: 132, marginLeft: b.out ? "auto" : undefined }}
              >
                &nbsp;
              </p>
              <div className="pbm-bubble pbk-fill" style={{ width: b.width, maxWidth: "100%" }}>
                {Array.from({ length: b.lines }, () => NBSP).join("\n")}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* The reply card is real chrome, not data, but it arrives with the
          rest of the pane, so its box is reserved here or the transcript would
          jump when it lands: the "Reply to …" label, the 72px writing box,
          then the note and Send along its foot (Thread.tsx, 19 Nov 2026). */}
      <div className="pbm-composer-wrap" aria-hidden>
        <div className="pbm-composer pbm-reply-card">
          <span className="pbm-reply-label pbk-text" style={{ width: 96 }}>
            &nbsp;
          </span>
          <div className="pbm-composer-input" />
          <div className="pbm-reply-foot">
            <p className="pbm-composer-foot pbk-text" style={{ maxWidth: 360 }}>
              &nbsp;
            </p>
            <span className="pbm-send pbk-fill" style={{ width: 89 }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function RailSkeleton() {
  return (
    <aside
      className="pbm-rail pbk"
      data-rail="auto"
      aria-busy="true"
      aria-label="Loading contact details"
    >
      <div className="pbm-rail-head" aria-hidden>
        <span className="pbm-rail-title pbk-text" style={{ width: 92 }}>
          &nbsp;
        </span>
        <span className="pbm-rail-close pbk-fill" />
      </div>

      <div className="pbm-rail-card" aria-hidden>
        {/* First got in touch and Conversations with you — the two
            label/value pairs ContactRail renders. */}
        {["58%", "30%"].map((w, i) => (
          <div key={i}>
            <p className="pbm-rail-label pbk-text" style={{ width: 54 }}>
              &nbsp;
            </p>
            <p className="pbm-rail-value pbk-text" style={{ width: w }}>
              &nbsp;
            </p>
          </div>
        ))}
      </div>

      <span
        className="pbm-rail-title pbm-rail-title--sub pbk-text"
        style={{ width: 58 }}
        aria-hidden
      >
        &nbsp;
      </span>
      {/* ContactNotes: the add-note box first, then the list, which for most
          customers is the "nothing noted yet" paragraph. */}
      <div className="pbn-form" aria-hidden>
        <div className="pbn-input pbk-fill" />
      </div>
      <div aria-hidden>
        {["100%", "92%", "60%"].map((w, i) => (
          <p key={i} className="pbm-rail-void pbk-text" style={{ width: w, margin: "0 0 4px" }}>
            &nbsp;
          </p>
        ))}
      </div>
    </aside>
  );
}
