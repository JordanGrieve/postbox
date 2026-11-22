import "./product-shot.css";

/**
 * The product, shown rather than described — built as DOM, not a screenshot.
 *
 * ── KEEP IT THE PRODUCT AS IT IS TODAY ──
 * Jordan, 21 Nov 2026: "always update the product shots". This is a replica,
 * and a replica drifts: until that day it still showed the folders, labels and
 * stars the simple inbox removed on 18–19 Nov (Thread.tsx, MailNavShell.tsx).
 * WHEN THE INBOX, THE CONVERSATION OR THE COMPOSER CHANGES, CHANGE THIS TOO —
 * compare it against the render harnesses (tests/mail-views-render,
 * tests/dashboard-views-render "nav", tests/newsletter-views-render), which
 * render the real components. What it shows today:
 *   • the sidebar: workspace, Inbox with its count, Newsletter, Settings, and
 *     the signed-in person at the foot (components/mail/MailNavShell.tsx);
 *   • the list: "To reply" / "Done", search, cards with "from email" or "from
 *     contact form" (InboxView);
 *   • the conversation: "Mark as done", the customer's bubble and the reply
 *     with its delivery status, the reply box (Thread.tsx);
 *   • the composer: the email's fields beside its live preview.
 *
 * ── A MAC WINDOW ──
 * Jordan, same day: "make them look like it was from a mac". Traffic lights
 * and a centred title, a 12px corner and a soft window shadow. It is a picture
 * of an app window, so it does not draw a browser address bar.
 *
 * ── IT BLENDS INTO THE PAGE ──
 * Every colour is a theme token (product-shot.css), including the sidebar,
 * which reads the --nav family as the real one does — light in light, dark in
 * dark. It used to paint the always-dark --brand-panel in both.
 *
 * ── WHY NOT AN ACTUAL SCREENSHOT ──
 *  1. THEMES. A screenshot is one palette; this reads the visitor's.
 *  2. RESOLUTION. Text stays sharp at every size and on every display.
 *  3. CUSTOMER DATA. Every name here is written in the open and invented.
 *
 * ── IT IS DECORATIVE, AND MARKED AS SUCH ──
 * The body is aria-hidden; the prose beside each shot carries the meaning, so
 * nothing here may carry information the page states nowhere else.
 */

/**
 * The things a callout can point at. Each is rendered INSIDE the element it
 * names, so the dot follows that element at every width and wrap. They were
 * percentages of the frame until 22 Nov 2026, measured at 1280px; at 920px
 * every dot had drifted onto the text it was meant to sit beside.
 */
export type AnnotationAnchor =
  | "list-title"
  | "contact-form-source"
  | "delivered"
  | "unsubscribe";

export type Annotation = {
  /** What it points at. Kept to a few words — this is a label, not a sentence. */
  text: string;
  at: AnnotationAnchor;
  /**
   * Where the label sits: "right" of the thing (the dot just after it),
   * "left" of it (the dot just before it), or "above" it on a vertical
   * leader, for something with content on both sides.
   */
  from: "left" | "right" | "above";
};

/** The list's cards. All invented; see the note above. */
const CARDS = [
  {
    name: "Marcus Bell",
    when: "9m",
    preview: "Order 4821 turned up this morning and two of the boxes were crushed.",
    source: "from email",
    active: true,
  },
  {
    name: "Priya Raman",
    when: "1h",
    preview: "Do you cater for gluten-free events? It would be a team lunch for 25.",
    source: "from contact form",
  },
  {
    name: "Tom Whitfield",
    when: "3h",
    preview: "Invoice 3391 has the wrong VAT rate, I think. No rush at all.",
    source: "from email",
  },
  {
    name: "Daniel Foss",
    when: "5h",
    preview: "Is the Tuesday class still running next week?",
    source: "from contact form",
  },
];

export type ShotFocus = "full" | "inbox" | "thread" | "newsletter";

const TITLES: Record<ShotFocus, string> = {
  full: "Inbox — Postbox",
  inbox: "Inbox — Postbox",
  thread: "Marcus Bell — Postbox",
  newsletter: "New campaign — Postbox",
};

/* Small line icons, drawn like the app's own (components/mail/icons.tsx). */
const icon = {
  width: 12,
  height: 12,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function InboxIcon() {
  return (
    <svg {...icon}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function NewsletterIcon() {
  return (
    <svg {...icon}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg {...icon}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </svg>
  );
}

export default function ProductShot({
  annotations = [],
  focus = "full",
  className = "",
}: {
  annotations?: Annotation[];
  focus?: ShotFocus;
  className?: string;
}) {
  /*
    The callout drawn at an anchor, if one was asked for there. It sits in the
    aria-hidden body with everything else it is drawn on; the same words are
    given to screen readers once, after the body.
  */
  const noteAt = (at: AnnotationAnchor) => {
    const a = annotations.find((n) => n.at === at);
    if (!a) return null;
    return (
      <span className="pshot-note" data-from={a.from}>
        <span className="pshot-note-label">{a.text}</span>
      </span>
    );
  };
  const firstFormCard = CARDS.findIndex((c) => c.source === "from contact form");

  return (
    <div
      className={`pshot-frame ${className}`.trim()}
      data-focus={focus}
      // The invented inbox appears three times on the homepage, and its
      // made-up customer messages were a third of the page's words to a
      // search engine. data-nosnippet keeps them out of search results.
      data-nosnippet=""
    >
      {/* The macOS title bar: close, minimise, zoom, and the window title. */}
      <div className="pshot-bar" aria-hidden>
        <span className="pshot-lights">
          <span className="pshot-light pshot-light--close" />
          <span className="pshot-light pshot-light--min" />
          <span className="pshot-light pshot-light--zoom" />
        </span>
        <span className="pshot-title">{TITLES[focus]}</span>
      </div>

      {focus === "newsletter" ? (
        <div className="pshot-body" aria-hidden data-focus="newsletter">
          {/*
            The composer beside its live preview, as /newsletters/write lays
            it out. The preview is the point: it is rendered by the same
            function the send path calls, so the unsubscribe link and postal
            address in it are the real ones.
          */}
          <div className="pshot-compose">
            <p className="pshot-pane-title">The email</p>
            <p className="pshot-field-label">Subject line</p>
            <div className="pshot-input">This week: sourdough is back</div>

            <p className="pshot-field-label">Layout</p>
            <div className="pshot-input pshot-input--quiet">
              Plain &mdash; like a personal email
            </div>
          </div>

          <div className="pshot-preview">
            <div className="pshot-preview-head">
              <p className="pshot-pane-title">Preview</p>
              <span className="pshot-seg">
                <span className="pshot-seg-on">Desktop</span>
                <span>Mobile</span>
              </span>
            </div>
            <div className="pshot-email">
              <p className="pshot-email-body">Hi Sam,</p>
              <p className="pshot-email-body">
                The rye starter is finally behaving, so sourdough is back on the
                shelf from Thursday.
              </p>
              <p className="pshot-email-body">Thanks, Emma</p>
              <div className="pshot-email-foot">
                <p>
                  Don&rsquo;t want these emails?{" "}
                  <span className="pshot-email-link pshot-anchor">
                    Unsubscribe
                    {noteAt("unsubscribe")}
                  </span>
                  .
                </p>
                {/* Obviously invented (21 Nov 2026). */}
                <p>Open Door Bakery, 1 Example Street, Anytown</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="pshot-body" aria-hidden data-focus={focus}>
          {/* A div, not <aside>: a picture of a sidebar, not one. */}
          <div className="pshot-side">
            <div className="pshot-brand">
              <span className="pshot-brand-mark">
                <InboxIcon />
              </span>
              <span className="pshot-brand-name">Open Door Bakery</span>
            </div>
            <ul className="pshot-nav">
              <li className="pshot-nav-item" data-active>
                <InboxIcon />
                <span className="pshot-nav-label">Inbox</span>
                <span className="pshot-nav-badge">4</span>
              </li>
              <li className="pshot-nav-item">
                <NewsletterIcon />
                <span className="pshot-nav-label">Newsletter</span>
              </li>
              <li className="pshot-nav-item">
                <SettingsIcon />
                <span className="pshot-nav-label">Settings</span>
              </li>
            </ul>
            <div className="pshot-me">
              <span className="pshot-me-face">E</span>
              <span className="pshot-me-text">
                <span className="pshot-me-name">emma@opendoor…</span>
                <span className="pshot-me-role">Owner</span>
              </span>
            </div>
          </div>

          <div className="pshot-list">
            <p className="pshot-list-title pshot-anchor">
              Inbox
              {noteAt("list-title")}
            </p>
            <div className="pshot-tabs">
              <span className="pshot-tab" data-on>
                To reply <b>4</b>
              </span>
              <span className="pshot-tab">
                Done <b>12</b>
              </span>
            </div>
            <div className="pshot-search">Search messages&hellip;</div>
            {CARDS.map((c, i) => (
              <article
                key={c.name}
                className="pshot-card"
                data-active={c.active || undefined}
              >
                <div className="pshot-card-top">
                  <span className="pshot-card-name">{c.name}</span>
                  <span className="pshot-card-when">{c.when}</span>
                </div>
                <p className="pshot-card-preview">{c.preview}</p>
                <p className="pshot-card-source pshot-anchor">
                  {c.source}
                  {i === firstFormCard && noteAt("contact-form-source")}
                </p>
              </article>
            ))}
          </div>

          <div className="pshot-thread">
            <div className="pshot-thread-head">
              <span className="pshot-thread-who">
                <span className="pshot-thread-name">Marcus Bell</span>
                <span className="pshot-thread-sub">marcus.bell@example.com</span>
              </span>
              <span className="pshot-done">&#10003; Mark as done</span>
            </div>

            <div className="pshot-bubbles">
              <p className="pshot-meta">Marcus &middot; 9:41 am</p>
              <div className="pshot-bubble">
                Order 4821 turned up this morning and two of the boxes were
                crushed. Is it too late to swap them?
              </div>

              <p className="pshot-meta pshot-meta--out">
                You &middot; 9:50 am &middot;{" "}
                {/* The label doing real work: a delivery the provider
                    confirmed, not just "sent". */}
                <span className="pshot-meta-ok pshot-anchor">
                  Delivered
                  {noteAt("delivered")}
                </span>
              </p>
              <div className="pshot-bubble pshot-bubble--out">
                Caught it just in time — it hadn&rsquo;t gone to packing yet.
                Two fresh boxes are on their way.
              </div>
            </div>

            <div className="pshot-reply">
              <span className="pshot-reply-label">Reply to Marcus</span>
              <span className="pshot-reply-hint">Write your reply&hellip;</span>
              <span className="pshot-send">Send</span>
            </div>
          </div>
        </div>
      )}

      {/*
        The callouts' words, for screen readers: the drawn ones are inside the
        aria-hidden body. Hidden visually at every width (the drawn ones go at
        900px and below, where the section's prose carries the same points).
      */}
      {annotations.length > 0 && (
        <ul className="pshot-sr">
          {annotations.map((a) => (
            <li key={a.at}>{a.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
