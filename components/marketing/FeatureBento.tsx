import "./feature-bento.css";

/**
 * The breadth of the product, in one screenful.
 *
 * ── WHY A GRID AND NOT MORE ALTERNATING SECTIONS ──
 * The three showcases above cost roughly 500px of scroll each, which is the
 * right price for the three things that decide whether somebody signs up. It
 * is the wrong price for the next seven. Past about four repeats of the same
 * left-right rhythm the eye stops reading the copy, and the page becomes long
 * without becoming more convincing.
 *
 * A grid answers a different question, too. The showcases are a sequence —
 * mail arrives, you answer it, you send a newsletter. This is a set: things
 * somebody scans in any order looking for the one that matters to them. That
 * is what a grid is for and what a stack of sections is not.
 *
 * ── THE FRAGMENTS ARE THE ICONS ──
 * Each cell carries a scrap of real interface rather than a glyph. An icon of
 * a clock says "something about time"; the actual held-until-you-open chip
 * says what the product does. It also means the cells cannot drift into
 * describing features that do not exist, because somebody has to draw the
 * thing.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ──
 * The shared inbox, threaded replies and the newsletter are absent because the
 * three showcases above already show them properly. Repeating them here would
 * make the page say the same thing twice in two different ways, which reads as
 * padding. This grid is only what those sections do not cover.
 *
 * Every fragment is aria-hidden; the title and line beside it carry the
 * meaning for anyone not looking at it.
 */

export default function FeatureBento() {
  return (
    <ul className="pbento">
      {/* The dominant cell. Out-of-hours holding is the most distinctive thing
          the product does — and the one competitors get wrong by cheerfully
          answering at 2am as though somebody were there. */}
      <li className="pbento-cell pbento-cell--wide">
        <h3 className="pbento-title">Nobody waits until Monday</h3>
        <p className="pbento-body">
          Set your opening hours and Postbox acknowledges enquiries that arrive
          out of hours — <em>held</em> until you open, so it never claims
          somebody is around at 2am when they are not.
        </p>
        <div className="pbento-art pbento-art--hours" aria-hidden>
          <div className="pbento-chip pbento-chip--muted">
            Arrived 23:41 &middot; Saturday
          </div>
          <div className="pbento-chip pbento-chip--accent">
            Held &middot; sends when you open at 07:00
          </div>
        </div>
      </li>

      <li className="pbento-cell">
        <h3 className="pbento-title">You know who you are talking to</h3>
        <p className="pbento-body">
          Every thread shows when this person first got in touch and what they
          have asked before.
        </p>
        <div className="pbento-art" aria-hidden>
          {/* The About panel's own wording (components/mail/ContactRail). */}
          <div className="pbento-mini">
            <span className="pbento-mini-k">First got in touch</span>
            <span className="pbento-mini-v">27 Aug 2025</span>
            <span className="pbento-mini-k">Conversations with you</span>
            <span className="pbento-mini-v">7</span>
          </div>
        </div>
      </li>

      {/*
        Three cells replaced on 21 Nov 2026. They sold "Labels and stars",
        "Snooze and archive" and a trash, which the simple inbox took out of
        the interface on 18–19 Nov (Thread.tsx): the data is kept, but nobody
        can use them. These are what the app does instead.
      */}
      <li className="pbento-cell">
        <h3 className="pbento-title">To reply, then done</h3>
        <p className="pbento-body">
          Two lists, not eleven folders. Replying moves a conversation to Done,
          and if the customer writes back it comes back to To reply.
        </p>
        <div className="pbento-art pbento-art--row" aria-hidden>
          <span className="pbento-tag">To reply &middot; 4</span>
          <span className="pbento-tag">Done &middot; 12</span>
        </div>
      </li>

      <li className="pbento-cell">
        <h3 className="pbento-title">Notes only your team sees</h3>
        <p className="pbento-body">
          Allergies, the usual order, what was agreed on the phone — kept
          beside the conversation and never shown to the customer.
        </p>
        <div className="pbento-art" aria-hidden>
          <div className="pbento-chip pbento-chip--muted">
            Wholesale &middot; orders every Tuesday
          </div>
        </div>
      </li>

      <li className="pbento-cell">
        <h3 className="pbento-title">Find any conversation</h3>
        <p className="pbento-body">
          Search by name, address or anything somebody wrote, across every
          message your business has received.
        </p>
        <div className="pbento-art" aria-hidden>
          <div className="pbento-chip pbento-chip--accent">
            Search: &ldquo;sourdough&rdquo;
          </div>
        </div>
      </li>

      <li className="pbento-cell pbento-cell--full">
        <h3 className="pbento-title">Everyone answers as the shop</h3>
        <p className="pbento-body">
          Invite whoever helps out. Customers see your business, not a rota of
          individual names.
        </p>
        <div className="pbento-art pbento-art--row" aria-hidden>
          <span className="pbento-face">E</span>
          <span className="pbento-face">R</span>
          <span className="pbento-face">M</span>
          <span className="pbento-face pbento-face--plus">+2</span>
        </div>
      </li>
    </ul>
  );
}
