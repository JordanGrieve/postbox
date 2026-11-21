import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "../components/marketing/JsonLd";
import {
  faqJsonLd,
  organizationJsonLd,
  softwareJsonLd,
} from "../lib/structured-data";
import { PLANS } from "../lib/pricing";
import { PUBLIC_CONTACT_EMAIL } from "../lib/config";

/**
 * Structured data on the public pages (21 Nov 2026).
 *
 * The one place the product writes raw HTML, so the escape is the first thing
 * checked: a "<" left in the data could close the script tag early.
 */
describe("serializeJsonLd", () => {
  it("escapes every < so no string can close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c/script>");
    // Still valid JSON that reads back to the original.
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("the data says what the pages say", () => {
  it("offers exactly the plans on the pricing page, in pounds", () => {
    const offers = softwareJsonLd().offers;
    expect(offers.map((o) => o.name)).toEqual(PLANS.map((p) => p.name));
    expect(offers.map((o) => Number(o.price))).toEqual(PLANS.map((p) => p.price));
    expect(offers.every((o) => o.priceCurrency === "GBP")).toBe(true);
  });

  it("names the organisation's public address", () => {
    expect(organizationJsonLd().email).toBe(PUBLIC_CONTACT_EMAIL);
  });

  it("turns each question into a Question with its answer", () => {
    const faq = faqJsonLd([{ q: "Do I need a card?", a: "No." }]);
    expect(faq.mainEntity).toEqual([
      { "@type": "Question", name: "Do I need a card?", acceptedAnswer: { "@type": "Answer", text: "No." } },
    ]);
  });
});
