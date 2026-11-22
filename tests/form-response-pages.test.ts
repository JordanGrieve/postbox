import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formErrorPage,
  formReturnUrl,
  formSuccessPage,
  FORM_PAGE_COLOURS as C,
} from "../lib/form-response-pages";
import { contrastRatio, parseHex } from "../lib/email-colour";

/**
 * The pages a client's customer lands on after a no-JavaScript contact form
 * post. They are public, read by strangers, and held to the same AAA bar as
 * every other page (STYLE-GUIDE.md) — which they used to miss: no lang, body
 * text at ~4.8:1, px font sizes.
 */

function ratio(fg: string, bg: string): number {
  const a = parseHex(fg);
  const b = parseHex(bg);
  if (!a || !b) throw new Error(`unparseable colour pair ${fg} on ${bg}`);
  return contrastRatio(a, b);
}

const PAGES = {
  success: formSuccessPage("Bramble Bakery"),
  error: formErrorPage("Please include your email address."),
};

describe("contact form response pages", () => {
  it("every text colour clears AAA (7:1) on the ground it sits on", () => {
    // [ink, ground, what]
    const pairs: Array<[string, string, string]> = [
      [C.ink, C.card, "heading on the card"],
      [C.body, C.card, "body text on the card"],
      [C.ink, C.mark, "tick on its circle"],
      [C.ink, C.page, "anything on the page ground"],
    ];
    for (const [fg, bg, what] of pairs) {
      expect(ratio(fg, bg), what).toBeGreaterThanOrEqual(7);
    }
  });

  for (const [name, html] of Object.entries(PAGES)) {
    it(`${name}: declares its language and a viewport`, () => {
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('name="viewport"');
    });

    it(`${name}: sizes text in rem, never px`, () => {
      expect(html).not.toMatch(/font-size:\s*[\d.]+px/);
    });

    it(`${name}: uses only the named colours`, () => {
      const hexes = html.match(/#[0-9a-fA-F]{3,6}\b/g) ?? [];
      const allowed = new Set(Object.values(C).map((h) => h.toLowerCase()));
      expect(hexes.length).toBeGreaterThan(0);
      for (const h of hexes) expect(allowed).toContain(h.toLowerCase());
    });
  }

  it("escapes what it is given", () => {
    expect(formSuccessPage('<img src=x onerror="alert(1)">')).not.toContain("<img");
    expect(formErrorPage("<script>x</script>")).toContain("&lt;script&gt;");
  });
});

/*
  22 Nov 2026 gap run: after posting the no-code form, the visitor was left on
  a Postbox page with no way back to the business's own site but the browser's
  back button. The browser's Referer names the page the form was on — on a
  cross-site post, its origin — so that is where the link goes.
*/
describe("the way back to the business's site", () => {
  it("is the origin of the page the form was posted from", () => {
    expect(formReturnUrl("https://www.amoria.co.uk/contact?x=1")).toEqual({
      href: "https://www.amoria.co.uk/",
      label: "amoria.co.uk",
    });
    expect(formReturnUrl("http://localhost:3000/")).toEqual({
      href: "http://localhost:3000/",
      label: "localhost:3000",
    });
  });

  it("is never anything but an http(s) page", () => {
    expect(formReturnUrl(null)).toBeNull();
    expect(formReturnUrl("")).toBeNull();
    expect(formReturnUrl("not a url")).toBeNull();
    expect(formReturnUrl("javascript:alert(1)")).toBeNull();
    expect(formReturnUrl("data:text/html,hi")).toBeNull();
  });

  it("is offered on both pages when known, and absent when not", () => {
    const back = { href: "https://amoria.co.uk/", label: "amoria.co.uk" };
    for (const html of [formSuccessPage("Amoria", back), formErrorPage("Please add your email.", back)]) {
      expect(html).toContain('<a class="back" href="https://amoria.co.uk/">Back to amoria.co.uk</a>');
    }
    expect(formSuccessPage("Amoria")).not.toContain('class="back"');
  });

  it("escapes the label and the address", () => {
    const html = formSuccessPage("Amoria", { href: 'https://x.test/"><b>', label: "<b>x</b>" });
    expect(html).not.toContain("<b>");
  });

  it("is a 44px target in the named ink", () => {
    expect(formSuccessPage("Amoria")).toMatch(/\.back\{[^}]*min-height:2\.75rem/);
  });

  it("is passed through by the contact route", () => {
    const route = readFileSync(join(process.cwd(), "app/api/tickets/[id]/route.ts"), "utf8");
    expect(route).toContain('formReturnUrl(req.headers.get("referer"))');
  });
});
