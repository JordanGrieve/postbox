import { APP_URL, OPERATOR_NAME, PUBLIC_CONTACT_EMAIL } from "./config";
import { PLANS, TRIAL_DAYS } from "./pricing";

/**
 * Structured data (schema.org JSON-LD) for the public pages, 21 Nov 2026.
 *
 * Why it matters here more than usual: "Postbox" is also the name of a
 * desktop email client and of a UK mail-forwarding service, and both own the
 * brand searches. An Organization block that says plainly what THIS Postbox is
 * — a shared inbox and newsletter service for small businesses, at this
 * address, run by this person — is how a search engine tells them apart.
 *
 * Everything is built from the same constants the pages render, so the data
 * cannot claim a price or a contact address the page does not show.
 */

const ORG_ID = `${APP_URL}/#organization`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Postbox",
    alternateName: "Postbox shared inbox",
    url: `${APP_URL}/`,
    logo: `${APP_URL}/icon.svg`,
    email: PUBLIC_CONTACT_EMAIL,
    description:
      "A shared support inbox and newsletter service for small businesses in the UK.",
    founder: { "@type": "Person", name: OPERATOR_NAME },
    areaServed: "GB",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: PUBLIC_CONTACT_EMAIL,
      url: `${APP_URL}/contact`,
      availableLanguage: "en-GB",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Postbox",
    url: `${APP_URL}/`,
    inLanguage: "en-GB",
    publisher: { "@id": ORG_ID },
  };
}

/** The product and its three prices, for /pricing (and the homepage). */
export function softwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Postbox",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${APP_URL}/`,
    description: `A shared inbox for your website's contact form and support email, with confirmed opt-in newsletters. ${TRIAL_DAYS}-day free trial.`,
    publisher: { "@id": ORG_ID },
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: plan.price.toFixed(2),
      priceCurrency: "GBP",
      url: `${APP_URL}/pricing`,
      category: "subscription",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: plan.price.toFixed(2),
        priceCurrency: "GBP",
        unitText: "MONTH",
      },
    })),
  };
}

export function faqJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
