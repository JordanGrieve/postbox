import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { OPERATOR_NAME, POSTBOX_CONTACT_KEY, PUBLIC_CONTACT_EMAIL } from "@/lib/config";
import { CONTACT_HONEYPOT_FIELDS } from "@/lib/subscribe";
import { DEMO_CTA, DEMO_SUBJECT, TRIAL_HREF } from "@/lib/marketing-copy";
import { pageMetadata } from "@/lib/page-metadata";
import "../home.css";
import "../contact/contact.css";

export const metadata: Metadata = pageMetadata({
  path: "/demo",
  title: "Request a demo",
  description:
    "See Postbox before you sign up: a shared support inbox and newsletters for small UK businesses, shown round by the person who runs it.",
});

const FIRST_NAME = OPERATOR_NAME.split(" ")[0];

/**
 * "Request a demo" (Jordan, 16 Nov 2026).
 *
 * ── IT IS THE CONTACT FORM WITH A SUBJECT ──
 * Same endpoint, same key and same rate limits as /contact (whose header says
 * why that matters: a path only Postbox uses could rot unnoticed). The hidden
 * subject is the only difference, so a demo request lands in Postbox's own
 * inbox as "Demo request" and is answered like any other enquiry.
 *
 * The endpoint reads name, email, message and subject and nothing else, so
 * there is no separate "business name" box that would be silently dropped:
 * the message label asks for it instead.
 *
 * No JavaScript, prerendered, no loading.tsx: the same as /contact.
 */
export default function DemoPage() {
  return (
    <div className="home">
      <MarketingNav />
      <main className="ct-wrap">
        <div className="ct-col">
          <h1 className="ct-title">See Postbox before you sign up</h1>
          <p className="ct-lede">
            Tell us a little about your business and {FIRST_NAME}, who runs
            Postbox, will show you round: the shared inbox, your contact form
            arriving in it, and the newsletter. It&rsquo;s free, and you are
            under no obligation.
          </p>
          <p className="ct-lede">
            Rather try it yourself? <Link href={TRIAL_HREF}>Start a free trial</Link>{" "}
            &mdash; no card needed.
          </p>

          {POSTBOX_CONTACT_KEY ? (
            <form
              className="ct-form"
              method="post"
              action={`/api/tickets/${encodeURIComponent(POSTBOX_CONTACT_KEY)}`}
            >
              <input type="hidden" name="subject" value={DEMO_SUBJECT} />

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
                  Your business, what you&rsquo;d like to see, and when suits you
                </span>
                <textarea
                  className="ct-input ct-textarea"
                  name="message"
                  rows={6}
                  maxLength={10000}
                  required
                />
              </label>

              {/* The contact endpoint's own trap names; see /contact. */}
              <div className="ct-trap" aria-hidden="true">
                {CONTACT_HONEYPOT_FIELDS.map((field) => (
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
                {DEMO_CTA}
              </button>

              <p className="ct-fine">
                {FIRST_NAME} will reply by email to find a time. Your request
                arrives in Postbox&rsquo;s own inbox, the product you&rsquo;ll be
                shown.
              </p>
            </form>
          ) : (
            // No key: the address, not a form that would post nowhere.
            <p className="ct-unset" role="status">
              To ask for a demo, email{" "}
              <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>.
            </p>
          )}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
