import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contactFormAlert, contactFormState, type IngestTarget } from "../lib/forms";

/**
 * The console has to say when nobody can contact Postbox.
 *
 * ── THE FAILURE THIS EXISTS FOR, FOUND LIVE ──
 * postbox.help/contact currently renders "this form isn't connected yet"
 * because POSTBOX_CONTACT_KEY is unset in production. Every "Get in touch"
 * button on the pricing page — one per plan, plus the nav — points at it. So
 * the marketing site advertises three plans and cannot take a single enquiry.
 *
 * What makes it able to sit like that is the honesty of the page itself: it
 * tells the VISITOR plainly that the form is dead, which is the right thing to
 * tell them, and the exact reason nobody on this side finds out. There is no
 * error, no failed request, and no missing enquiry to notice — enquiries have
 * nowhere to be lost from.
 *
 * It is the same shape as the six weeks Open Door Bakery spent behind a broken
 * contact form, which is why "Needs a look" exists on the accounts tab.
 */

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8");

const sections = read("app", "(admin)", "admin", "sections.tsx");
const page = read("app", "(admin)", "admin", "page.tsx");
const contact = read("app", "contact", "page.tsx");

describe("the contact key is an environment gate like the others", () => {
  it("is declared on ConsoleGates", () => {
    expect(sections).toContain("contactForm: ContactFormState;");
  });

  it("is read from POSTBOX_CONTACT_KEY, not from a second source of truth", () => {
    // The page must agree with lib/config.ts about what "set" means — trimmed,
    // and empty-is-null. Reading process.env here directly would let the
    // console call it configured while the contact page called it missing.
    expect(page).toContain("contactForm: await contactFormState(POSTBOX_CONTACT_KEY)");
    expect(page).toContain('from "@/lib/config"');
  });

  it("warns on the overview when it is not live", () => {
    expect(sections).toContain('gates.contactForm !== "live"');
    expect(sections).toContain("Nobody can contact Postbox right now");
  });

  it("says which of the two ways it is broken", () => {
    // 25 Nov 2026: the key was set, so the warning stayed hidden, while the
    // workspace it named had been deleted from this console. /contact showed
    // a form whose every post was refused. The fix for each case differs.
    expect(sections).toMatch(/gates\.contactForm === "no-workspace"/);
    expect(sections).toMatch(/no longer exists/);
  });

  it("puts the warning ABOVE the numbers it does not qualify", () => {
    /*
     * Every other gate warning sits beside the figure it explains. This one
     * explains no figure — it says the front door is locked — so it goes
     * first, before KpiGrid, rather than being filed among the caveats.
     */
    const start = sections.indexOf("export function OverviewSection");
    const body = sections.slice(start, sections.indexOf("\nexport function", start + 10));
    expect(body.indexOf('gates.contactForm !== "live"')).toBeLessThan(
      body.indexOf("<KpiGrid"),
    );
  });

  it("tells the operator how to fix it, not just that it is broken", () => {
    // A warning with no next step gets read once and skipped afterwards.
    expect(sections).toMatch(/create a workspace here for Postbox itself/i);
  });
});

describe("contactFormState asks what the endpoint would answer", () => {
  const target = {
    workspace: { id: 1 },
    form: null,
  } satisfies Partial<Record<keyof IngestTarget, unknown>> as IngestTarget;

  it("is unset when there is no key, without a lookup", async () => {
    let looked = false;
    const state = await contactFormState(null, async () => {
      looked = true;
      return target;
    });
    expect(state).toBe("unset");
    expect(looked).toBe(false);
  });

  it("is no-workspace when the key resolves to nothing", async () => {
    expect(await contactFormState("cli_gone", async () => null)).toBe("no-workspace");
  });

  it("is live when the key resolves, and looks up the key it was given", async () => {
    let asked = "";
    const state = await contactFormState("cli_here", async (k) => {
      asked = k;
      return target;
    });
    expect(state).toBe("live");
    expect(asked).toBe("cli_here");
  });
});

describe("the daily health check pushes it, rather than waiting for the console", () => {
  const route = read("app", "api", "cron", "health", "route.ts");

  it("raises nothing when the form is live", () => {
    expect(contactFormAlert("live")).toBeNull();
  });

  it("raises an error for a key whose workspace is gone, and says so", () => {
    const a = contactFormAlert("no-workspace");
    expect(a?.level).toBe("error");
    expect(a?.detail).toMatch(/no longer exists/);
  });

  it("raises one for an unset key too, on its own fingerprint", () => {
    const unset = contactFormAlert("unset");
    expect(unset).not.toBeNull();
    expect(unset?.fingerprint).not.toBe(contactFormAlert("no-workspace")?.fingerprint);
  });

  it("is asked by the health route with the same key the page reads", () => {
    expect(route).toContain("contactFormState(POSTBOX_CONTACT_KEY)");
    expect(route).toContain("contactFormAlert(");
    expect(route).toContain('scope.setTag("alert_kind", "contact_form")');
  });

  it("reports a failed lookup as its own alert, not as a healthy form", () => {
    expect(route).toContain("Could not check whether /contact can deliver");
  });
});

describe("the contact page stays honest when the key is missing", () => {
  it("renders a form only when the key is set", () => {
    expect(contact).toMatch(/POSTBOX_CONTACT_KEY \?/);
  });

  it("says so plainly rather than showing a form that goes nowhere", () => {
    // A form that silently drops a message is worse than no form: the sender
    // waits for a reply that was never coming.
    expect(contact).toMatch(/isn&rsquo;t connected yet/);
  });

  it("is prerendered, because rendering per request bought nothing in production", () => {
    // It was force-dynamic so a key set without rebuilding would show. On
    // Vercel no code sees a changed variable until a redeploy anyway, and
    // `next dev` renders per request regardless; meanwhile the live page was
    // uncacheable (no-store). Reversed 21 Nov 2026.
    expect(contact).not.toContain('export const dynamic = "force-dynamic"');
  });
});
