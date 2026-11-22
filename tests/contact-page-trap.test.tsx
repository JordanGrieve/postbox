import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/*
  22 Nov 2026: /contact rendered the SIGNUP's trap names ("website",
  "company") while POST /api/tickets checks the contact list ("pb_hp_…"),
  so the contact page's honeypot caught nothing and nothing said so.
*/
vi.mock("@/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/config")>()),
  POSTBOX_CONTACT_KEY: "pb_live_contact_key",
}));

const { default: Contact } = await import("../app/contact/page");
const { CONTACT_HONEYPOT_FIELDS, HONEYPOT_FIELDS } = await import("../lib/subscribe");

describe("the contact page's trap", () => {
  it("uses the names the contact endpoint checks", () => {
    const html = renderToStaticMarkup(Contact());
    expect(html).toContain('action="/api/tickets/pb_live_contact_key"');
    for (const field of CONTACT_HONEYPOT_FIELDS) expect(html).toContain(`name="${field}"`);
    for (const field of HONEYPOT_FIELDS) expect(html).not.toContain(`name="${field}"`);
  });
});
