import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * "Request a demo" (Jordan, 16 Nov 2026; built 22 Nov 2026).
 *
 * A demo request is a contact-form enquiry into Postbox's own workspace with
 * the subject "Demo request", posted to the same public endpoint every client
 * uses — no second code path that only Postbox would ever exercise.
 */

const config = vi.hoisted(() => ({ key: "pb_live_contact_key" as string | null }));
vi.mock("@/lib/config", async (importOriginal) => {
  const real = await importOriginal<typeof import("../lib/config")>();
  return {
    ...real,
    get POSTBOX_CONTACT_KEY() {
      return config.key;
    },
  };
});

const { default: Demo } = await import("../app/demo/page");
const { default: Contact } = await import("../app/contact/page");
const { CONTACT_HONEYPOT_FIELDS, HONEYPOT_FIELDS } = await import("../lib/subscribe");
const { DEMO_SUBJECT } = await import("../lib/marketing-copy");
const { PUBLIC_CONTACT_EMAIL } = await import("../lib/config");

beforeEach(() => {
  config.key = "pb_live_contact_key";
});

describe("the demo page", () => {
  it("posts into Postbox's own workspace through the public endpoint", () => {
    const html = renderToStaticMarkup(Demo());
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/api/tickets/pb_live_contact_key"');
  });

  it("marks the enquiry as a demo request in its subject", () => {
    const html = renderToStaticMarkup(Demo());
    expect(DEMO_SUBJECT).toBe("Demo request");
    expect(html).toMatch(/<input type="hidden" name="subject" value="Demo request"\/>/);
  });

  it("asks for the three things the endpoint requires, and says what to write", () => {
    const html = renderToStaticMarkup(Demo());
    for (const field of ["name", "email", "message"]) {
      // The whole tag carrying this name, whatever order React wrote it in.
      const tag = html.match(new RegExp(`<(?:input|textarea)[^>]*name="${field}"[^>]*>`))?.[0];
      expect(tag, `no field named ${field}`).toBeDefined();
      expect(tag).toContain("required");
    }
    expect(html).toContain("Request a demo");
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it("sets the trap the contact endpoint actually checks", () => {
    const html = renderToStaticMarkup(Demo());
    for (const field of CONTACT_HONEYPOT_FIELDS) expect(html).toContain(`name="${field}"`);
    for (const field of HONEYPOT_FIELDS) expect(html).not.toContain(`name="${field}"`);
  });

  it("with no key, offers the email address instead of a form that posts nowhere", () => {
    config.key = null;
    const html = renderToStaticMarkup(Demo());
    expect(html).not.toContain("<form");
    expect(html).toContain(`mailto:${PUBLIC_CONTACT_EMAIL}`);
  });
});

describe("the contact page's trap", () => {
  /*
    Found while building the demo page: /contact rendered the SIGNUP's trap
    names ("website", "company") while POST /api/tickets checks the contact
    list ("pb_hp_…") — so the contact page's honeypot caught nothing.
  */
  it("uses the names the contact endpoint checks", () => {
    const html = renderToStaticMarkup(Contact());
    for (const field of CONTACT_HONEYPOT_FIELDS) expect(html).toContain(`name="${field}"`);
    for (const field of HONEYPOT_FIELDS) expect(html).not.toContain(`name="${field}"`);
  });
});
