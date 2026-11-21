import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { POSTBOX_CONTACT_KEY, PUBLIC_CONTACT_EMAIL } from "@/lib/config";
import { HONEYPOT_FIELDS } from "@/lib/subscribe";
import { pageMetadata } from "@/lib/page-metadata";
import "../home.css";
import "./contact.css";

export const metadata: Metadata = pageMetadata({
  path: "/contact",
  title: "Contact",
  description:
    "Talk to the person who runs Postbox about a shared support inbox and newsletters for your business. Email hello@postbox.help or use the form.",
});

/*
  Prerendered, from 21 Nov 2026. It was force-dynamic so that setting
  POSTBOX_CONTACT_KEY without rebuilding would still show the form. That only
  ever helped locally: `next dev` renders per request anyway, and on Vercel a
  changed environment variable needs a redeploy before ANY code sees it. In
  production force-dynamic bought nothing and made the page uncacheable,
  rendered on every visit (no-store, measured on the live site).
*/

/**
 * How anybody reaches Postbox.
 *
 * ── THE HOLE THIS FILLS ──
 * The pricing page's only call to action read "Get in touch" and linked to
 * /sign-in. A prospect, who by definition has no account, was sent to a Google
 * sign-in wall. With self-serve signup closed that was the single conversion
 * path on the page, and it was a dead end. Nothing anywhere in the product let
 * a client — existing or prospective — say anything to Postbox at all.
 *
 * ── IT IS THE PRODUCT, NOT A SPECIAL CASE ──
 * A plain HTML form posting to POST /api/tickets/:key: the same public
 * ingestion endpoint, the same key shape, the same honeypot fields and the
 * same rate limits every client's own website uses. Postbox has a workspace
 * like any other client and enquiries land in it.
 *
 * That is deliberate rather than convenient. A bespoke contact route would be
 * a second code path that only Postbox uses, so it could rot for months
 * without anyone noticing. This one cannot: if it breaks, it is broken for
 * every client simultaneously and somebody says so the same morning.
 *
 * It also gives "Priority support from us" — sold on the Business plan —
 * something to actually be. Until now there was no channel behind it.
 *
 * ── NO JAVASCRIPT ──
 * Same reasoning as app/s/[key]/page.tsx: a real `action`, so it works with
 * scripting off, and the endpoint answers a form post with its own HTML
 * success page. Nothing here has to know what happens next.
 */
export default function ContactPage() {
  return (
    <div className="home">
      <MarketingNav current="contact" />
      <main className="ct-wrap">
        <div className="ct-col">
          <h1 className="ct-title">Get in touch</h1>
          <p className="ct-lede">
            Questions about Postbox, or whether it suits your business? Write
            here or email{" "}
            <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>.
            Jordan, who runs Postbox, reads and answers every message.
          </p>
          <p className="ct-lede">
            Ready to try it? <Link href="/sign-up">Start a free trial</Link>{" "}
            &mdash; no card needed.
          </p>

          {POSTBOX_CONTACT_KEY ? (
            <form
              className="ct-form"
              method="post"
              action={`/api/tickets/${encodeURIComponent(POSTBOX_CONTACT_KEY)}`}
            >
              <label className="ct-field">
                <span className="ct-label">Your name</span>
                <input
                  className="ct-input"
                  type="text"
                  name="name"
                  autoComplete="name"
                  maxLength={120}
                  required
                />
              </label>

              <label className="ct-field">
                <span className="ct-label">Email address</span>
                <input
                  className="ct-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>

              <label className="ct-field">
                <span className="ct-label">
                  Subject <span className="ct-optional">optional</span>
                </span>
                <input
                  className="ct-input"
                  type="text"
                  name="subject"
                  maxLength={200}
                />
              </label>

              <label className="ct-field">
                <span className="ct-label">Message</span>
                <textarea
                  className="ct-input ct-textarea"
                  name="message"
                  rows={6}
                  maxLength={10000}
                  required
                />
              </label>

              {/*
                The same trap the hosted signup form uses, rendered from the
                same shared constant so the two can never disagree about the
                names. A trap the server still checks but the form stopped
                emitting is a trap that catches nothing, and nothing would fail
                loudly to say so.
              */}
              <div className="ct-trap" aria-hidden="true">
                {HONEYPOT_FIELDS.map((field) => (
                  <input
                    key={field}
                    type="text"
                    name={field}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                ))}
              </div>

              <button className="ct-button" type="submit">
                Send
              </button>

              <p className="ct-fine">
                Your message becomes a support ticket in our own Postbox
                workspace &mdash; the same product this page is selling. We use
                what we ship.
              </p>
            </form>
          ) : (
            /*
              Unset key. Says so rather than rendering a form that posts
              nowhere: a contact form that silently discards a message is worse
              than no contact form, because the sender believes they have been
              in touch and waits.
            */
            <p className="ct-unset" role="status">
              <b>This form isn&rsquo;t connected yet.</b> Postbox&rsquo;s own
              workspace key has not been configured, so nothing here would
              reach anybody &mdash; and a form that quietly drops a message is
              worse than no form, because you would be left waiting for a reply
              that was never going to come.
            </p>
          )}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
