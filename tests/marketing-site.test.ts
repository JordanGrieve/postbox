import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pageMetadata } from "../lib/page-metadata";
import { PUBLIC_CONTACT_EMAIL, OPERATOR_TRADING_AS } from "../lib/config";

/**
 * The public site after the 21 Nov 2026 rework (landing-page critique).
 *
 * Read from source because the pages are server components with Clerk and
 * Next behind them; the render harness (tests/public-views-render) proves they
 * render, this proves they say and link what they should.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const PAGES = {
  home: read("app/page.tsx"),
  pricing: read("app/pricing/page.tsx"),
  contact: read("app/contact/page.tsx"),
};
const LEGAL_LAYOUT = read("app/(legal)/layout.tsx");
const NAV = read("components/marketing/MarketingNav.tsx");
const FOOTER = read("components/marketing/MarketingFooter.tsx");
const PRIVACY = read("app/(legal)/privacy/page.tsx");
const TERMS = read("app/(legal)/terms/page.tsx");
const PROXY = read("proxy.ts");

describe("there is a way in", () => {
  it("never tells a visitor to ask a provider they do not have", () => {
    for (const [name, src] of Object.entries(PAGES)) {
      // Comments may quote the old wording; the rendered strings may not.
      const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, name).not.toMatch(/ask your provider/i);
    }
  });

  it("offers the trial from the nav, the homepage and every pricing card", () => {
    expect(NAV).toContain("href={TRIAL_HREF}");
    // Hero and the closing band.
    expect(PAGES.home.match(/href=\{TRIAL_HREF\}/g)?.length).toBeGreaterThanOrEqual(2);
    // One per card (rendered in the map) and the closing band.
    expect(PAGES.pricing.match(/href=\{TRIAL_HREF\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(PAGES.pricing).not.toMatch(/OPEN_SIGNUP \? "\/sign-up" : "\/contact"/);
  });
});

describe("the homepage's newsletter points", () => {
  it("fill whole rows of three, so none sits alone on a row", () => {
    // 22 Nov 2026: four points laid out three and one (Jordan: "maybe 5 or 6?").
    const block = PAGES.home.slice(PAGES.home.indexOf("const NEWSLETTER_POINTS"));
    const array = block.slice(0, block.indexOf("];"));
    const count = array.match(/title: "/g)?.length ?? 0;
    expect(count).toBe(6);
  });
});

describe("the homepage sells setup with no DNS changes", () => {
  /*
    Jordan, 25 Nov 2026: "one of our big advantages is they do not need to add
    us to their DNS records ... this is a sell." Most rivals make a business
    add records before they can send as its domain; Postbox sends from its own
    verified address under the business's name, so there is nothing to add.
  */
  it("says so in a heading of its own", () => {
    expect(PAGES.home).toMatch(/<h2 className="home-h2">[^<]*DNS[^<]*<\/h2>/);
  });

  it("explains it in whole rows of three", () => {
    const block = PAGES.home.slice(PAGES.home.indexOf("const SETUP_POINTS"));
    const array = block.slice(0, block.indexOf("];"));
    expect(array.match(/title: "/g)?.length ?? 0).toBe(3);
    expect(PAGES.home).toContain("SETUP_POINTS.map(");
  });

  it("stays true: replies go out from Postbox's own address, not the business's domain", () => {
    // If replies ever send from a client's domain, that domain needs DNS
    // records and the homepage claim becomes false. Change both together.
    const reply = read("app/api/tickets/[id]/reply/route.ts");
    expect(reply).toContain("from: EMAIL_FROM_ADDRESS");
    const campaigns = read("lib/campaign-send.ts");
    expect(campaigns).toContain("from: campaignFromHeader(input.workspaceName, input.from)");
  });
});

describe("the pricing FAQ", () => {
  const css = read("app/pricing/pricing.css");

  it("opens and closes with a transition, not a jump", () => {
    // Jordan, 22 Nov 2026: "a bit slower when opening and closing".
    expect(css).toMatch(/interpolate-size:\s*allow-keywords/);
    expect(css).toMatch(/\.prc-faq-item::details-content\s*\{[^}]*transition:[^}]*block-size/);
    expect(css).toMatch(/\.prc-faq-item\[open\]::details-content\s*\{[^}]*block-size:\s*auto/);
  });
});

describe("who runs it, on every public page", () => {
  it("the footer names the operator and the public address", () => {
    expect(FOOTER).toContain("OPERATOR_TRADING_AS");
    expect(FOOTER).toContain("PUBLIC_CONTACT_EMAIL");
    expect(PUBLIC_CONTACT_EMAIL).toBe("hello@postbox.help");
    expect(OPERATOR_TRADING_AS).toBe("Jordan Grieve, trading as Postbox");
  });

  it("every public page carries it", () => {
    for (const [name, src] of Object.entries(PAGES)) {
      expect(src, name).toContain("<MarketingFooter />");
    }
    expect(LEGAL_LAYOUT).toContain("<MarketingFooter />");
  });

  it("the privacy policy names the controller, a contact and the ICO", () => {
    expect(PRIVACY).toContain("Who we are");
    expect(PRIVACY).toContain("OPERATOR_TRADING_AS");
    expect(PRIVACY).toContain("PUBLIC_CONTACT_EMAIL");
    expect(PRIVACY).toContain("ico.org.uk");
    expect(PRIVACY).not.toMatch(/contact your account provider/);
    expect(TERMS).not.toMatch(/contact\s+your account provider/);
  });
});

describe("share previews and canonicals", () => {
  const m = pageMetadata({ path: "/pricing", title: "Pricing", description: "D" });

  it("builds the whole preview, not part of one", () => {
    expect(m.alternates?.canonical).toBe("/pricing");
    const og = m.openGraph as { images: { url: string }[]; siteName: string; locale: string; title: string };
    expect(og.images[0]!.url).toBe("/opengraph-image");
    expect(og.siteName).toBe("Postbox");
    expect(og.locale).toBe("en_GB");
    expect(og.title).toBe("Pricing | Postbox");
    const tw = m.twitter as { title: string; card: string; images: string[] };
    expect(tw.title).toBe("Pricing | Postbox");
    expect(tw.card).toBe("summary_large_image");
    expect(tw.images).toEqual(["/opengraph-image"]);
  });

  it("is used by every public page", () => {
    for (const [name, src] of Object.entries(PAGES)) {
      expect(src, name).toContain("pageMetadata(");
    }
    expect(PRIVACY).toContain("pageMetadata(");
    expect(TERMS).toContain("pageMetadata(");
  });
});

/*
  Lighthouse's link-in-text-block (21 Nov 2026): the accent was the only thing
  marking links inside sentences, at 1.12–1.65:1 against the sentence's own
  ink. The project's probes check a link's NAME, not how it stands out, so
  this guard holds the underline instead.
*/
describe("links inside sentences are underlined", () => {
  const rule = (css: string, selector: string) => {
    const at = css.indexOf(`${selector} {`);
    expect(at, `${selector} has no rule`).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf("}", at));
  };

  it("on the homepage, contact page and legal pages", () => {
    expect(rule(read("app/home.css"), ".home-sub a")).toMatch(/text-decoration:\s*underline/);
    expect(rule(read("app/contact/contact.css"), ".ct-lede a")).toMatch(/text-decoration:\s*underline/);
    expect(rule(LEGAL_LAYOUT, ".legal-prose a")).toMatch(/text-decoration:\s*underline/);
  });

  it("the two navigation landmarks are told apart by name", () => {
    expect(NAV).toMatch(/<nav[^>]*aria-label="Main"/);
    expect(FOOTER).toMatch(/<nav[^>]*aria-label="Footer"/);
  });
});

/*
  Jordan, 21 Nov 2026: "always update the product shots". The shot and the
  feature tiles had kept selling folders, labels, stars, snooze and a trash
  for days after the simple inbox removed them from the interface (18–19
  Nov). This cannot prove the replica matches the app, but it does fail on
  the features known to be gone, and on the shots leaving the theme.
*/
describe("the product shots and tiles show the app as it is", () => {
  const SHOT = read("components/marketing/ProductShot.tsx").toString();
  const SHOT_CSS = read("components/marketing/product-shot.css").toString();
  const BENTO = read("components/marketing/FeatureBento.tsx").toString();
  const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$|\{\/\*[\s\S]*?\*\/\}/gm, "");

  it("sell nothing the inbox no longer has", () => {
    for (const [name, src] of [["ProductShot", SHOT], ["FeatureBento", BENTO]] as const) {
      const visible = code(src);
      for (const gone of [/Snooze/, /Labels and stars/, /\bStarred\b/, /In the trash/, /Awaiting reply/, /All mail/]) {
        expect(visible, `${name} still shows ${gone}`).not.toMatch(gone);
      }
    }
  });

  it("show the simple inbox: To reply / Done, Inbox, Newsletter, Settings", () => {
    for (const shown of ["To reply", "Done", "Newsletter", "Settings", "Mark as done", "from contact form"]) {
      expect(SHOT, shown).toContain(shown);
    }
  });

  it("follow the theme, sidebar included (no fixed dark panel)", () => {
    expect(code(SHOT_CSS)).not.toContain("--brand-panel");
    expect(SHOT_CSS).toMatch(/\.pshot-side \{[^}]*background: var\(--nav\)/);
  });

  it("are drawn as a Mac window", () => {
    expect(SHOT).toContain("pshot-light--close");
    expect(SHOT_CSS).toMatch(/\.pshot-light--close \{\s*background: #ff5f57/);
  });
});

describe("the top bar's links are 44px targets", () => {
  /*
    22 Nov 2026 desktop journey test: Features, Pricing and Contact were 37px
    tall and the Postbox logo link 40px, beside a Sign in and Start free trial
    that were 44 — the only controls on the public site under 2.5.5.
  */
  const CSS = read("app/home.css");
  const rule = (sel: string) => {
    const at = CSS.indexOf(`${sel} {`);
    expect(at, `${sel} rule`).toBeGreaterThan(-1);
    return CSS.slice(at, CSS.indexOf("}", at));
  };

  it("the page links are at least 44px tall", () => {
    expect(rule(".home-nav-link")).toContain("min-height: var(--tap-min, 44px)");
  });

  it("so is the logo link home", () => {
    expect(NAV).toMatch(/className="home-nav-home"[^>]*aria-label="Postbox home"|aria-label="Postbox home"[^>]*className="home-nav-home"/);
    expect(rule(".home-nav-home")).toContain("min-height: var(--tap-min, 44px)");
  });
});

describe("newsletter signup is described as it works", () => {
  /*
    22 Nov 2026 journey test: the homepage said subscribers "confirm their own
    address by clicking a link we email them", pricing sold "confirmed opt-in",
    and the onboarding step waited for somebody to "confirm by email". Signup
    is single opt-in by default (db/schema.ts, requireSignupConfirmation), so
    a new subscriber got a welcome email and no link at all.
  */
  const SOURCES = {
    home: PAGES.home,
    pricingPage: PAGES.pricing,
    plans: read("lib/pricing.ts"),
    structuredData: read("lib/structured-data.ts"),
    onboarding: read("lib/onboarding.ts"),
  };
  const PROMISES = [
    "confirmed opt-in",
    "confirm their own address",
    "confirm by email",
    "confirms their address by email",
    "and confirmed.",
  ];

  for (const [name, text] of Object.entries(SOURCES)) {
    it(`${name} never promises a confirmation email`, () => {
      const lower = text.replace(/\s+/g, " ").toLowerCase();
      expect(PROMISES.filter((p) => lower.includes(p))).toEqual([]);
    });
  }
});

describe("the homepage can be served from the CDN", () => {
  it("does not read the session itself", () => {
    // Its header comment explains why it no longer calls auth(); only the code counts.
    const code = PAGES.home.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bauth\(\)/);
    expect(code).not.toContain("@clerk/nextjs/server");
  });

  it("the proxy sends a signed-in visitor on to the inbox instead", () => {
    const branch = PROXY.slice(PROXY.indexOf('pathname === "/"'));
    expect(branch).toContain("await auth()");
    expect(branch).toContain('new URL("/inbox", req.url)');
  });
});
