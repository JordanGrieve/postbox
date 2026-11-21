import type { Metadata } from "next";
import Link from "next/link";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import JsonLd from "@/components/marketing/JsonLd";
import ProductShot from "@/components/marketing/ProductShot";
import FeatureBento from "@/components/marketing/FeatureBento";
import { OPERATOR_LOCATION, OPERATOR_NAME } from "@/lib/config";
import { PLANS, TRIAL_DAYS, formatPrice } from "@/lib/pricing";
import { pageMetadata } from "@/lib/page-metadata";
import { TRIAL_CTA, TRIAL_HREF, TRIAL_NOTE } from "@/lib/marketing-copy";
import {
  organizationJsonLd,
  softwareJsonLd,
  websiteJsonLd,
} from "@/lib/structured-data";
import "./home.css";

const FROM_PRICE = formatPrice(Math.min(...PLANS.map((p) => p.price)));
const TEAM_PLAN = PLANS.find((p) => p.limits.subscribers > 0 && p.limits.seats >= 3);

/*
  Written for the searches a small business actually makes, 21 Nov 2026. The
  old title, "support tickets that feel like an inbox", contained none of
  them, and "Postbox" alone is owned in search by a desktop email client and
  a mail-forwarding service.
*/
export const metadata: Metadata = pageMetadata({
  path: "/",
  title: "Postbox — shared inbox and newsletters for small UK businesses",
  absolute: true,
  description: `Put your website's contact form and support email in one shared inbox your team answers from, and send newsletters from the same place. From ${FROM_PRICE} a month.`,
});

/**
 * The public marketing page.
 *
 * ── STATIC, FROM 21 NOV 2026 ──
 * It used to call Clerk's auth() to send signed-in visitors to their inbox,
 * which made the busiest page on the site render on every request with
 * `no-store` — never cached, slower first byte, and no back/forward cache.
 * That redirect now happens in proxy.ts, before the page is reached, so this
 * page is prerendered once and served from the CDN.
 *
 * ── ONE WAY IN ──
 * Every call to action is "Start free trial" to /sign-up, with a note saying
 * what happens next (lib/marketing-copy.ts). Until 21 Nov 2026, with sign-up
 * closed, the page offered only "See pricing" and "ask your provider for
 * access" — no way for a business to start at all.
 *
 * ── EVERY CLAIM HERE MUST BE TRUE ──
 * No invented testimonials, no customer logos, no "trusted by hundreds of
 * businesses". A marketing page for a product whose pitch is trustworthy
 * email cannot itself be the least trustworthy page we ship. What it CAN say
 * truthfully, and now does: who runs it, where the data lives, and what it
 * costs against the two tools it replaces.
 */
export default function LandingPage() {
  return (
    <div className="home">
      <MarketingNav current="home" />

      <main style={{ flex: 1 }}>
        <section className="home-hero">
          <div className="home-hero-inner">
            <p className="home-eyebrow">For small businesses</p>

            <h1 className="home-h1">
              Every customer email in <em>one shared inbox</em>
            </h1>

            <p className="home-lede">
              Postbox puts your website&rsquo;s contact form and your support
              email into one inbox your whole team can answer from &mdash; and
              sends your newsletter from the same place, to people who asked
              for it. From {FROM_PRICE} a month.
            </p>

            <div className="home-cta-row">
              <Link className="home-btn home-btn--primary" href={TRIAL_HREF}>
                {TRIAL_CTA}
              </Link>
              <Link className="home-btn home-btn--ghost" href="/pricing">
                See pricing
              </Link>
            </div>

            <p className="home-cta-note">{TRIAL_NOTE}</p>
          </div>

          {/*
            The product, shown. NO ANNOTATIONS HERE: the hero's job is
            recognition — "oh, it's like an email client" in half a second.
            The feature sections below carry the labelled crops.
          */}
          <div className="home-shot">
            <ProductShot />
          </div>
        </section>

        {/*
          THE THREE LOAD-BEARING FEATURES, SHOWN. Alternating sides, one idea
          per image, at most two callouts each.
        */}
        <section
          className="home-showcase home-section--after-shot home-wrap"
          id="features"
        >
          <div className="home-show">
            <div className="home-show-copy">
              <p className="home-kicker">The inbox</p>
              <h2 className="home-show-title">
                Your contact form and your email, in one list
              </h2>
              <p className="home-show-body">
                Everything a customer sends arrives in the same place, labelled
                with where it came from. No forwarding rules, and nothing
                sitting unread in a mailbox only one person can open.
              </p>
              <p className="home-show-body">
                Whoever is free answers. The whole team sees the same threads,
                so no customer gets two replies &mdash; or none.
              </p>
            </div>
            <div className="home-show-shot">
              <ProductShot
                focus="inbox"
                annotations={[
                  {
                    // Measured against the "Order" chip, not guessed.
                    text: "Where it came from",
                    top: "71.6%",
                    left: "60.9%",
                    from: "right",
                  },
                  {
                    text: "One list, every channel",
                    top: "13%",
                    left: "82%",
                    from: "right",
                  },
                ]}
              />
            </div>
          </div>

          <div className="home-show home-show--flip">
            <div className="home-show-copy">
              <p className="home-kicker">Replies</p>
              <h2 className="home-show-title">
                Replies that arrive, and you can see they did
              </h2>
              <p className="home-show-body">
                Your answer reaches the customer as an ordinary email from your
                business, and their reply comes back to the same thread.
              </p>
              <p className="home-show-body">
                If a message bounces, the thread tells you &mdash; instead of
                you finding out when the customer chases you.
              </p>
            </div>
            <div className="home-show-shot">
              <ProductShot
                focus="thread"
                annotations={[
                  {
                    text: "Confirmed by the mail provider",
                    top: "84%",
                    left: "76%",
                    from: "right",
                  },
                ]}
              />
            </div>
          </div>

          <div className="home-show">
            <div className="home-show-copy">
              <p className="home-kicker">Newsletters</p>
              <h2 className="home-show-title">
                A newsletter, without another tool to pay for
              </h2>
              <p className="home-show-body">
                Customers sign up from a form on your own website and confirm
                by email. You write the newsletter in Postbox and send it to
                everyone who said yes.
              </p>
              <p className="home-show-body">
                Already have a list somewhere else? Send it one last email with
                a link to your Postbox signup page, and everyone who confirms
                comes with you.
              </p>
            </div>
            <div className="home-show-shot">
              <ProductShot
                focus="newsletter"
                annotations={[
                  {
                    text: "One-click unsubscribe, always",
                    top: "70%",
                    left: "30%",
                    from: "left",
                  },
                ]}
              />
            </div>
          </div>
        </section>

        {/*
          The price argument, which the page never made. Postbox replaces two
          tools that are each usually priced per person. Stated without
          naming anybody else's prices, which change; the claim that holds is
          ours: one flat price for the team, both halves included.
        */}
        {TEAM_PLAN && (
          <section className="home-section home-wrap">
            <p className="home-kicker">One tool instead of two</p>
            <h2 className="home-h2">
              Your inbox and your newsletter, one price for the team
            </h2>
            <p className="home-sub">
              Most small businesses answer email in one tool and send
              newsletters from another, and pay for each person on each. Postbox
              does both. {TEAM_PLAN.name} is {formatPrice(TEAM_PLAN.price)} a
              month for up to {TEAM_PLAN.limits.seats} people and{" "}
              {TEAM_PLAN.limits.subscribers.toLocaleString("en-GB")}{" "}
              subscribers, and every plan starts with a {TRIAL_DAYS}-day free
              trial. <Link href="/pricing">Compare the plans</Link>.
            </p>
          </section>
        )}

        <section className="home-section home-wrap">
          <p className="home-kicker">What else it does</p>
          <h2 className="home-h2">The everyday things a shared Gmail can&rsquo;t do</h2>
          <p className="home-sub">
            Small things, and the reason a team keeps using it after the first
            week.
          </p>
          <FeatureBento />
        </section>

        <section className="home-section home-wrap" id="newsletters">
          <p className="home-kicker">Deliverability</p>
          <h2 className="home-h2">Newsletters that land in the inbox</h2>
          <p className="home-sub">
            Mail providers decide whether your newsletter reaches anyone. These
            are the things they check, and Postbox does them for you.
          </p>

          <div className="home-grid">
            {NEWSLETTER_POINTS.map((f) => (
              <div className="home-card" key={f.title}>
                <h3 className="home-card-title">{f.title}</h3>
                <p className="home-card-body">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/*
          Who is behind it. A bakery deciding whether to move its customer
          email into an unfamiliar tool wants to know there is a person
          answerable for it. There are no customer quotes to show yet, and
          none are invented; this is what is true instead.
        */}
        <section className="home-section home-wrap">
          <p className="home-kicker">Who&rsquo;s behind it</p>
          <h2 className="home-h2">Built and run by one person, in Scotland</h2>
          <p className="home-sub">
            Postbox is made by {OPERATOR_NAME} in {OPERATOR_LOCATION}. Every
            business is set up personally, and when you write in,{" "}
            {OPERATOR_NAME.split(" ")[0]} answers. Your data is stored in
            London, there are no ads and no tracking cookies, and you can
            download everything in your inbox whenever you like.{" "}
            <Link href="/contact">Ask a question</Link>.
          </p>
        </section>

        <section className="home-section home-section--last home-wrap">
          <div className="home-band">
            <div>
              <h2 className="home-band-title">Try it with your own customers</h2>
              <p className="home-band-sub">
                {TRIAL_DAYS} days free, no card. Connect your contact form and
                see real enquiries arrive.
              </p>
            </div>
            <Link className="home-btn home-btn--primary" href={TRIAL_HREF}>
              {TRIAL_CTA}
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={softwareJsonLd()} />
    </div>
  );
}

/*
 * The deliverability points, kept as text. They are claims about PROCESS —
 * what is recorded, what is refused, what happens to a bounce — and there is
 * no screen that shows a consent record being kept. Rewritten 21 Nov 2026 to
 * lead with what it does for the business, not with the mechanism.
 */
const NEWSLETTER_POINTS = [
  {
    title: "Only people who said yes",
    body: "Subscribers confirm their own address by clicking a link we email them. No bought lists, nobody added by hand — which is exactly what keeps you out of spam folders.",
  },
  {
    title: "Proof, if anyone asks",
    body: "For every subscriber Postbox keeps how and when they signed up and confirmed. If a customer ever asks why they are on your list, you can show them.",
  },
  {
    title: "Unsubscribing takes one click",
    body: "Every newsletter has a one-click unsubscribe that works without logging in, and the address is never emailed again.",
  },
  {
    title: "Bad addresses clean themselves up",
    body: "Addresses that bounce or mark you as spam are dropped automatically, and your postal address goes in every message, as the law requires.",
  },
];
