import Link from "next/link";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import JsonLd from "@/components/marketing/JsonLd";
import type { Metadata } from "next";
import { OPERATOR_LOCATION, OPERATOR_NAME, PUBLIC_CONTACT_EMAIL } from "@/lib/config";
import { PLANS, TRIAL_DAYS, TRIAL_LIMITS, VAT_REGISTERED, formatPrice } from "@/lib/pricing";
import {
  COMPETITORS_CHECKED,
  INBOX_RIVALS,
  USD_TO_GBP,
  aboutGbp,
  teamMonthlyUsd,
} from "@/lib/competitor-prices";
import { pageMetadata } from "@/lib/page-metadata";
import { faqJsonLd, softwareJsonLd } from "@/lib/structured-data";
import { TRIAL_CTA, TRIAL_HREF, TRIAL_NOTE } from "@/lib/marketing-copy";
import "../home.css";
import "./pricing.css";

/*
  ── EVERY INDEXABLE PAGE MUST DECLARE ITS OWN ──
  An inherited canonical made this page tell Google it was a duplicate of the
  homepage. tests/seo-canonical.test.ts guards it; lib/page-metadata.ts also
  builds the full share preview, which a partial openGraph object here used
  to wipe.
*/
// Prices from lib/pricing.ts, never typed here, so the snippet in search
// results cannot disagree with the cards.
const PRICES = PLANS.map((p) => formatPrice(p.price));

/** The plan the comparison prices: the one for a small team. */
const TEAM = (() => {
  const growth = PLANS.find((p) => p.id === "growth");
  if (!growth) throw new Error("No growth plan");
  return growth;
})();
export const metadata: Metadata = pageMetadata({
  path: "/pricing",
  title: `Pricing: shared inbox from ${PRICES[0]} a month`,
  description: `${PLANS.length} plans for small businesses: ${PRICES.slice(0, -1).join(", ")} and ${PRICES.at(-1)} a month. Shared support inbox, auto-replies and newsletters with recorded consent. ${TRIAL_DAYS}-day free trial, no card.`,
});

/**
 * The pricing page.
 *
 * ── THE NUMBERS ARE NOT SIGNED OFF ──
 * Every figure comes from lib/pricing.ts, which says so at length. They are a
 * proposal. This page renders from that module rather than restating anything,
 * so confirming the prices is a one-file edit and cannot leave the page and
 * the enforcement disagreeing.
 *
 * ── NO CHECKOUT ON THIS PAGE ──
 * The buttons start a trial, not a payment: /sign-up, then (with sign-up
 * closed) the request-for-access form and a hand approval. Payment happens
 * later, in /settings/billing, once a workspace exists. See
 * lib/marketing-copy.ts for why every button says the same thing.
 *
 * ── THE BUTTONS USED TO SAY "GET IN TOUCH" ──
 * And went to /contact (before that, to a sign-in wall). Until 21 Nov 2026
 * there was no way to START from this page, only to write in and wait. The
 * contact form is still linked from the band at the bottom, for questions.
 *
 * ── WHAT IS DELIBERATELY ABSENT ──
 * No annual toggle: annual pricing has not been decided, and a toggle that
 * flips between two identical numbers is a lie about having thought about it.
 * No "most popular" badge on a product with one pilot client — `featured`
 * highlights a plan visually without claiming other people chose it.
 */
export default function PricingPage() {
  return (
    <div className="home">
      <MarketingNav current="pricing" />

      <main style={{ flex: 1 }}>
        <section className="home-section home-wrap prc-head">
          <p className="home-kicker">Pricing</p>
          <h1 className="home-h2 prc-title">
            One price, everything included at that size
          </h1>
          <p className="home-sub prc-sub">
            Every plan starts with a {TRIAL_DAYS}-day free trial, and there is
            no minimum term. One price for the whole team, not per person
            {VAT_REGISTERED ? "." : ", and no VAT added: the price you see is what you pay."}
          </p>
          <p className="home-sub prc-sub prc-note">{TRIAL_NOTE}</p>
        </section>

        <section className="home-wrap">
          <div className="prc-grid">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={
                  plan.featured ? "prc-card prc-card--featured" : "prc-card"
                }
              >
                <h2 className="prc-name">{plan.name}</h2>
                <p className="prc-tagline">{plan.tagline}</p>

                <p className="prc-price">
                  <span className="prc-amount">{formatPrice(plan.price)}</span>
                  <span className="prc-period">per month</span>
                </p>

                <Link
                  className={
                    plan.featured
                      ? "home-btn home-btn--primary prc-cta"
                      : "home-btn home-btn--quiet prc-cta"
                  }
                  href={TRIAL_HREF}
                  // Three identical "Start free trial" buttons are three links
                  // with the same name to a screen reader; the plan says which.
                  aria-label={`${TRIAL_CTA} on ${plan.name}`}
                >
                  {TRIAL_CTA}
                </Link>

                <ul className="prc-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/*
                  Stated plainly on the card rather than buried in a footnote.
                  A limit somebody discovers by hitting it is a complaint; a
                  limit they read before paying is a decision they made.
                */}
                <p className="prc-limits">
                  {plan.limits.ticketsPerMonth.toLocaleString()} conversations a
                  month
                  {plan.limits.subscribers > 0
                    ? ` · up to ${plan.limits.subscribers.toLocaleString()} subscribers`
                    : " · newsletters not included"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/*
          The undercut, shown rather than claimed (Jordan, 23 Nov 2026). The
          rivals charge per person; a team of three is where most small
          businesses sit and where the difference is plainest. Their figures
          come from lib/competitor-prices.ts, dated and linked, and
          tests/pricing-comparison.test.tsx fails if any becomes cheaper.
        */}
        <section className="home-section home-wrap" aria-labelledby="prc-compare">
          <h2 className="home-h2" id="prc-compare">
            What a team of {TEAM.limits.seats} pays a month
          </h2>
          <ul className="prc-compare">
            <li className="prc-compare-row prc-compare-row--us">
              <span className="prc-compare-name">Postbox {TEAM.name}</span>
              <span className="prc-compare-what">
                Inbox and newsletters, whole team
              </span>
              <span className="prc-compare-price">{formatPrice(TEAM.price)}</span>
            </li>
            {INBOX_RIVALS.map((r) => {
              const usd = teamMonthlyUsd(r, TEAM.limits.seats);
              return (
                <li className="prc-compare-row" key={r.name}>
                  <span className="prc-compare-name">
                    {r.name} {r.plan}
                  </span>
                  <span className="prc-compare-what">Inbox only, per person</span>
                  <span className="prc-compare-price">
                    ${usd} <span className="prc-compare-gbp">(about £{aboutGbp(usd)})</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="prc-compare-note">
            Their cheapest plan, billed yearly, before any VAT, checked in{" "}
            {COMPETITORS_CHECKED}:{" "}
            {INBOX_RIVALS.map((r, i) => (
              <span key={r.name}>
                {i > 0 && ", "}
                <a href={r.source} rel="noopener">
                  {r.name}
                </a>
              </span>
            ))}
            . Pounds at $1 = £{USD_TO_GBP}.
          </p>
        </section>

        <section className="home-section home-wrap">
          <h2 className="home-h2">Questions people ask first</h2>
          {/*
            An accordion built from <details>, not from state.

            The answers here are long and of wildly different lengths, and as a
            multi-column grid that produced a page with holes in it — a
            two-line answer beside a six-line one leaves a block of empty
            space, and the eye reads the gap as something missing rather than
            as an answer that happened to be short.

            Native <details> rather than a React accordion: it needs no
            JavaScript, so it works before hydration and if hydration never
            happens; keyboard and screen-reader behaviour comes from the
            browser rather than from ARIA somebody has to maintain; and
            browsers open the relevant one for in-page find. A hand-built one
            is more code that does less.

            None is open by default. Every question here is one a specific
            person is looking for, and opening one for everybody makes it look
            like the most important answer rather than the first in the list.
          */}
          <div className="prc-faq">
            {FAQ.map((item) => (
              <details className="prc-faq-item" key={item.q}>
                <summary className="prc-faq-q">
                  {item.q}
                  <span className="prc-faq-mark" aria-hidden />
                </summary>
                <p className="prc-faq-a">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="home-section home-section--last home-wrap">
          <div className="home-band">
            <div>
              <h2 className="home-band-title">Still deciding?</h2>
              <p className="home-band-sub">
                The trial gives you {TRIAL_LIMITS.tickets} conversations and{" "}
                {TRIAL_LIMITS.subscribers} subscribers over {TRIAL_DAYS} days,
                which is enough to connect your form and see it working with
                real customers. Questions first?{" "}
                <Link href="/contact">Get in touch</Link>.
              </p>
            </div>
            <Link className="home-btn home-btn--primary" href={TRIAL_HREF}>
              {TRIAL_CTA}
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
      {/* What the page says, for search engines: the product with its three
          prices, and the questions above. Built from the same constants. */}
      <JsonLd data={softwareJsonLd()} />
      <JsonLd data={faqJsonLd(FAQ)} />
    </div>
  );
}

/*
 * Answers only. Every one of these is true of the product as it stands — the
 * trial mechanics described here are the ones being built in SELF-SERVE 3, so
 * this page and that work have to ship together or this becomes fiction.
 */
const FAQ = [
  {
    q: "What happens when the trial ends?",
    a: `The trial runs for ${TRIAL_DAYS} days or ${TRIAL_LIMITS.tickets} conversations, whichever comes first. When it ends you pick a plan. Your messages stay where they are — we do not delete anything because a trial lapsed.`,
  },
  {
    q: "Will you drop my customers' emails if I do not pay?",
    a: "No. Enquiries from your customers keep arriving and keep being recorded whatever your billing state — losing somebody's customer to a billing problem would be unforgivable. Sending newsletters is what stops, because that costs money and it affects you rather than them.",
  },
  {
    q: "Can I change plan later?",
    a: "Yes, up or down, whenever you like. If you move down to a plan with fewer seats you will be asked to remove people first, so nobody is signed out by surprise.",
  },
  {
    q: "Do I need a card to start?",
    a: "No. The trial does not ask for one.",
  },
  {
    q: "Can I bring the mailing list I already have?",
    /*
      Rewritten 21 Nov 2026. It used to stop at "Not by importing it", which
      is true and loses the sale: anybody moving from another tool has a
      list. The path below works today with nothing new built — the signup
      form and its hosted page exist — and every address it brings over
      arrives with its own consent record.
    */
    a: "Yes, by inviting them rather than importing them. Send your current list one last email from your old tool with a link to your Postbox signup page. Everyone who clicks and confirms joins your new list, with a record that they asked to — which is also why your newsletters land in inboxes rather than spam. Addresses are never imported, because nobody on a Postbox list can be there without having said yes.",
  },
  {
    q: "Who is behind Postbox?",
    a: `Postbox is run by ${OPERATOR_NAME} in ${OPERATOR_LOCATION}, and every business is set up personally. The app and its database are hosted in London. Questions go straight to ${OPERATOR_NAME} at ${PUBLIC_CONTACT_EMAIL}.`,
  },
];
