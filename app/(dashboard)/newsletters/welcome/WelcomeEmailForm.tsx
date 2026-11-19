"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { CampaignProduct } from "@/db/schema";
import {
  safeImageUrl,
  TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  type TemplateKey,
} from "@/lib/newsletter";
import { toShownTokens, toStoredTokens, WELCOME_TOKENS } from "@/lib/welcome-tokens";
import ProductsHeroEditor, {
  blankDraftProduct,
  draftProductFrom,
  type DraftProduct,
  type HeroAndProducts,
} from "@/components/newsletter/ProductsHeroEditor";
import WelcomePreview from "./WelcomePreview";

/** The subscriber the "With a name" preview is addressed to. */
const SAMPLE_NAME = "Lesley";

/**
 * The welcome email — what a new subscriber gets the moment they sign up.
 *
 * The whole screen, from Jordan's mockup (19 Nov 2026): a header with the
 * on/off switch, the email on the left, what the subscriber gets on the
 * right, and a bar along the bottom that says whether it is saved.
 *
 * ── ON BY DEFAULT, SINCE 14 SEP 2026 ──
 * It was off, with the note that "shipping a default that starts mailing a
 * client's customers is not a feature". That was right when signups were
 * double opt-in: the subscriber had just clicked a link and been told they
 * were on the list. Under single opt-in this email is the only acknowledgement
 * they get, and the only unsubscribe route for somebody a stranger typed into
 * a public form — so off by default meant three real people subscribing to a
 * client's list and hearing nothing at all. See db/schema.ts.
 *
 * ── IT IS A NEWSLETTER, NOT A NOTE ──
 * Layout, a photograph and products, the same pieces a campaign has and
 * validated by the same functions. Jordan, 14 Sep 2026: it should be "one that
 * whoever they sign up to has customised, so it's personal and nothing to do
 * with Postbox".
 *
 * ── THE TOKENS ──
 * The boxes show [First name] and [Business name]; what is saved, rendered
 * and sent is {first_name} and {company}. lib/welcome-tokens.ts translates at
 * load, at save and on the way into the preview, and nowhere else.
 *
 * No lib/config import, direct or transitive — client component. The page
 * reads the from-address and passes it down as a string.
 */
export default function WelcomeEmailForm({
  initial,
  hasPostalAddress,
  workspaceName,
  legalName,
  postalAddress,
  brandAccentHex,
  brandSignOff,
  viewerEmail,
  fromAddress,
}: {
  initial: {
    enabled: boolean;
    subject: string;
    body: string;
    templateKey: TemplateKey;
    heroImageUrl: string | null;
    heroImageAlt: string | null;
    products: CampaignProduct[];
  };
  /** Everything below is for the preview, which runs the real renderer. */
  workspaceName: string;
  legalName: string | null;
  postalAddress: string | null;
  brandAccentHex: string | null;
  brandSignOff: string | null;
  viewerEmail: string;
  /** The address it goes out from, as lib/welcome-store sends it. */
  fromAddress: string;
  /**
   * Whether Sender identity has an address. Without one the email cannot be
   * rendered at all (it is marketing mail and must carry one), so the screen
   * says that rather than letting somebody turn on a feature that will
   * silently refuse every time.
   */
  hasPostalAddress: boolean;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [subject, setSubject] = useState(() => toShownTokens(initial.subject));
  const [body, setBody] = useState(() => toShownTokens(initial.body));
  const [templateKey, setTemplateKey] = useState<TemplateKey>(initial.templateKey);
  // Held as strings, empty for "none". The server turns empty into null; a
  // null in the input would render the word "null" in the box.
  const [heroUrl, setHeroUrl] = useState(initial.heroImageUrl ?? "");
  const [heroAlt, setHeroAlt] = useState(initial.heroImageAlt ?? "");
  // Row ids are minted here, not from a module counter: the initial rows are
  // server-rendered, and their ids are in the DOM (label `for`), so they must
  // come out the same on the server and in the browser. 1..n does.
  const [products, setProducts] = useState<DraftProduct[]>(() =>
    initial.products.map((p, i) => draftProductFrom(p, i + 1)),
  );
  const nextProductId = useRef(initial.products.length + 1);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [withName, setWithName] = useState(true);

  /**
   * Back to the saved shape, id dropped. An empty field is null, nothing is
   * trimmed, a nameless row is left for parseProducts to skip.
   */
  const productList = useMemo<CampaignProduct[]>(
    () =>
      products.map((p) => ({
        name: p.name,
        price: p.price || null,
        imageUrl: p.imageUrl || null,
        url: p.url || null,
      })),
    [products],
  );

  const storedSubject = toStoredTokens(subject);
  const storedBody = toStoredTokens(body);
  /** Everything Save sends except `enabled`, which the switch saves itself. */
  const content = JSON.stringify({
    subject: storedSubject,
    body: storedBody,
    templateKey,
    heroImageUrl: heroUrl,
    heroImageAlt: heroAlt,
    products: productList,
  });
  // What the server last accepted. "Everything is saved" is a comparison
  // with it, so undoing an edit by hand counts as saved again.
  const [savedContent, setSavedContent] = useState(content);
  const dirty = content !== savedContent;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  /** What the last test send did. The reason is shown, not swallowed. */
  const [test, setTest] = useState<string | null>(null);

  function touch() {
    setError(null);
    setTest(null);
  }

  function patchMedia(next: Partial<HeroAndProducts>) {
    if (next.heroImageUrl !== undefined) setHeroUrl(next.heroImageUrl);
    if (next.heroImageAlt !== undefined) setHeroAlt(next.heroImageAlt);
    if (next.products !== undefined) setProducts(next.products);
    touch();
  }

  /** Put a token where the cursor is in the message, and leave it after it. */
  function insertToken(shown: string) {
    const el = bodyRef.current;
    const start = el ? el.selectionStart : body.length;
    const end = el ? el.selectionEnd : body.length;
    setBody(body.slice(0, start) + shown + body.slice(end));
    touch();
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + shown.length, start + shown.length);
    });
  }

  /** True when the server accepted it. */
  async function save(next?: { enabled: boolean }): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    setError(null);
    const sent = content;
    try {
      const res = await fetch("/api/welcome", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(JSON.parse(sent) as object),
          enabled: next ? next.enabled : enabled,
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Couldn’t save that.");
        return false;
      }
      if (next) setEnabled(next.enabled);
      setSavedContent(sent);
      return true;
    } catch {
      setError("Couldn’t reach the server. Check your connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  /**
   * Send it to yourself. The test sends what is SAVED, so unsaved edits are
   * saved first: a test of the previous version would be believed.
   *
   * The response carries the refusal REASON, unlike every other send in the
   * product — safe here because it goes to the caller's own address and the
   * person reading it is the only one who can fix it.
   */
  async function sendTest() {
    if (testing) return;
    if (dirty && !(await save())) return;
    setTesting(true);
    setTest(null);
    try {
      const res = await fetch("/api/welcome/test", { method: "POST" });
      const p = (await res.json()) as {
        sent?: boolean;
        to?: string;
        message?: string;
        detail?: string;
        error?: string;
      };
      if (!res.ok) setTest(p.error ?? "Couldn’t send a test.");
      else if (p.sent) setTest(`Test sent to ${p.to}.`);
      else setTest([p.message, p.detail].filter(Boolean).join(" — "));
    } catch {
      setTest("Couldn’t reach the server.");
    } finally {
      setTesting(false);
    }
  }

  const status = saving
    ? "Saving…"
    : testing
      ? "Sending a test…"
      : (test ?? (dirty ? "You have changes that aren’t saved." : "Everything is saved."));

  return (
    <div className="nw">
      <header className="nw-head">
        <Link className="stg-button stg-button--secondary nw-back" href="/newsletters">
          ← Newsletter
        </Link>
        <div className="nw-head-row">
          <div className="nw-head-text">
            <h1 className="nw-title">Welcome email</h1>
            <p className="nw-sub">Goes out by itself the moment someone signs up.</p>
          </div>
          {/* The whole pill is the switch, so its words are its name and the
              target is the pill rather than the 48px track. Saves at once:
              on or off is not a draft. */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            className="nw-onoff"
            data-on={enabled}
            disabled={saving || !hasPostalAddress}
            onClick={() => void save({ enabled: !enabled })}
          >
            <span>{enabled ? "On — sending automatically" : "Off — not sending"}</span>
            <span className="st-switch" data-on={enabled} aria-hidden>
              <span className="st-switch-knob" />
            </span>
          </button>
        </div>
        {!hasPostalAddress && (
          <p className="stg-identity-warn nw-warn" role="status">
            <b>Postal address missing.</b> It can&rsquo;t send until you add
            one in <Link href="/settings">Settings</Link>.
          </p>
        )}
      </header>

      <div className="nw-body">
        <div className="nw-form">
          <div className="nw-field">
            <label className="nw-label" htmlFor="nw-subject">
              Subject
            </label>
            <input
              id="nw-subject"
              className="stg-input"
              type="text"
              value={subject}
              maxLength={200}
              disabled={saving}
              onChange={(e) => {
                setSubject(e.target.value);
                touch();
              }}
            />
          </div>

          <div className="nw-field">
            <label className="nw-label" htmlFor="nw-body">
              Message
            </label>
            <textarea
              id="nw-body"
              ref={bodyRef}
              className="stg-input stg-textarea"
              value={body}
              rows={10}
              maxLength={5000}
              disabled={saving}
              onChange={(e) => {
                setBody(e.target.value);
                touch();
              }}
            />
            <div className="nw-insert">
              <span className="nw-insert-label">Insert:</span>
              {WELCOME_TOKENS.map((t) => (
                <button
                  key={t.stored}
                  type="button"
                  className="nw-chip"
                  disabled={saving}
                  onClick={() => insertToken(t.shown)}
                >
                  + {t.insertLabel}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="nw-field nw-fieldset">
            <legend className="nw-label">Look</legend>
            <div className="nw-looks">
              {TEMPLATE_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="nw-look"
                  data-look={key}
                  aria-pressed={templateKey === key}
                  disabled={saving}
                  onClick={() => {
                    setTemplateKey(key);
                    touch();
                  }}
                >
                  <LookPicture look={key} />
                  <span className="nw-look-name">{TEMPLATE_LABELS[key].name}</span>
                  <span className="nw-look-desc">{TEMPLATE_LABELS[key].description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* A link, not an upload: Postbox hosts no files yet (Jordan,
              19 Nov 2026: "paste a link for now"). The box is drawn as the
              mockup's drop area so an upload can replace the input inside it
              without moving anything. */}
          <div className="nw-field">
            <label className="nw-label" htmlFor="nw-hero-url">
              Picture <span className="nw-optional">· optional</span>
            </label>
            <div className="nw-photo">
              <span className="nw-photo-icon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="9" cy="10" r="1.8" fill="currentColor" />
                  <path d="M4 17l5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="nw-photo-text">
                <p className="nw-photo-title">Add a photo</p>
                <p className="nw-photo-help" id="nw-hero-help">
                  Paste a link to one on your website. Your shop front or a
                  fresh bake works well.
                </p>
                <input
                  id="nw-hero-url"
                  className="stg-input"
                  type="url"
                  inputMode="url"
                  placeholder="https://yourshop.com/photo.jpg"
                  value={heroUrl}
                  maxLength={2000}
                  disabled={saving}
                  aria-describedby="nw-hero-help"
                  onChange={(e) => patchMedia({ heroImageUrl: e.target.value })}
                />
                {heroUrl.trim() && !safeImageUrl(heroUrl) && (
                  <p className="nl-warn" role="status">
                    That link can&rsquo;t be used. It needs to start with{" "}
                    <b>https://</b>
                  </p>
                )}
                {heroUrl.trim() && (
                  <>
                    <label className="nw-sublabel" htmlFor="nw-hero-alt">
                      Describe the photo
                    </label>
                    <input
                      id="nw-hero-alt"
                      className="stg-input"
                      type="text"
                      placeholder="A tray of sourdough, just out of the oven"
                      value={heroAlt}
                      maxLength={200}
                      disabled={saving}
                      onChange={(e) => patchMedia({ heroImageAlt: e.target.value })}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* The composer's product editor, so the two cannot drift. Its own
              image field is off: the picture box above is this screen's. */}
          <div className="nw-products">
            <ProductsHeroEditor
              heroImageUrl={heroUrl}
              heroImageAlt={heroAlt}
              products={products}
              disabled={saving}
              onChange={patchMedia}
              newProduct={() => blankDraftProduct(nextProductId.current++)}
              showHero={false}
              addClassName="stg-button stg-button--secondary nw-add"
            />
          </div>
        </div>

        <aside className="nw-preview" aria-label="What they’ll get">
          <div className="nw-preview-head">
            <h2 className="nw-preview-title">What they&rsquo;ll get</h2>
            <div className="nw-seg" role="group" aria-label="Preview the subscriber">
              <button
                type="button"
                className="nw-seg-btn"
                aria-pressed={withName}
                onClick={() => setWithName(true)}
              >
                With a name
              </button>
              <button
                type="button"
                className="nw-seg-btn"
                aria-pressed={!withName}
                onClick={() => setWithName(false)}
              >
                Without
              </button>
            </div>
          </div>
          <WelcomePreview
            subject={storedSubject}
            body={storedBody}
            templateKey={templateKey}
            heroImageUrl={heroUrl}
            heroImageAlt={heroAlt}
            products={productList}
            workspaceName={workspaceName}
            legalName={legalName}
            postalAddress={postalAddress}
            brandAccentHex={brandAccentHex}
            brandSignOff={brandSignOff}
            viewerEmail={viewerEmail}
            recipientName={withName ? SAMPLE_NAME : null}
            fromAddress={fromAddress}
          />
        </aside>
      </div>

      <footer className="nw-bar">
        {error ? (
          <p className="nw-bar-status" data-tone="bad" role="alert">
            {error}
          </p>
        ) : (
          <p className="nw-bar-status" role="status">
            {status}
          </p>
        )}
        <div className="nw-bar-actions">
          <button
            className="stg-button stg-button--secondary"
            type="button"
            disabled={testing || saving}
            onClick={() => void sendTest()}
          >
            Send me a test
          </button>
          <button
            className="stg-button"
            type="button"
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </footer>
    </div>
  );
}

/**
 * A small drawing of what each layout actually sends, so the three cards
 * differ the way the emails do (Jordan, 19 Nov 2026: "make them look more
 * like it"):
 *
 *   Plain    — text on white, nothing else.
 *   Branded  — the business name over a rule in its colour, then the
 *              message in a white card on a grey ground.
 *   Feature  — dark and centred: the picture first, the opening line as a
 *              headline, the text under it.
 *
 * Decorative: the card's name and description are what a screen reader hears.
 */
function LookPicture({ look }: { look: TemplateKey }) {
  if (look === "plain") {
    return (
      <span className="nw-look-pic" data-look={look} aria-hidden>
        <span className="nw-look-line nw-look-line--hi" />
        <span className="nw-look-line" />
        <span className="nw-look-line" />
        <span className="nw-look-line nw-look-line--short" />
      </span>
    );
  }
  if (look === "branded") {
    return (
      <span className="nw-look-pic" data-look={look} aria-hidden>
        <span className="nw-look-brand" />
        <span className="nw-look-rule" />
        <span className="nw-look-card">
          <span className="nw-look-line" />
          <span className="nw-look-line" />
          <span className="nw-look-line nw-look-line--short" />
        </span>
      </span>
    );
  }
  return (
    <span className="nw-look-pic" data-look={look} aria-hidden>
      <span className="nw-look-hero" />
      <span className="nw-look-headline" />
      <span className="nw-look-line" />
      <span className="nw-look-line nw-look-line--short" />
    </span>
  );
}
