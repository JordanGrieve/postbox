import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/*
  ── THE SIGNED-IN ROUTES THE OTHER HARNESSES MISS ──

  The five component harnesses cover the screens somebody thought to build a
  fixture for. Comparing them against the route tree on 7 Sep 2026 turned up
  seven signed-in pages with no coverage of any kind:

      /search                 /settings/team
      /settings/billing       /settings/access-log
      /settings/forms         /subscribers/[id]

  (and /settings/contacts, removed on 21 Nov 2026)

  and, worse than any single page, MailNav -- the navigation column on EVERY
  signed-in screen. mail.css styles it (.pbm-nav-heading was one of the 10px
  labels raised to the 11px floor), and nothing had ever rendered it. The rest
  of the harnesses drop their view into a bare `.pb-shell.pbm` div, so the
  chrome around it was never in the picture.

  These are all async server components that fetch their own data, which is the
  /subscribers shape: await the page, stand in for the DATA LAYER only, and the
  page's own logic still runs for real.

    DASHBOARD_HARNESS_OUT=$PWD/public/_dh npx vitest run tests/dashboard-views-render
*/

const h = vi.hoisted(() => ({
  searchWorkspace: vi.fn(),
  viewerAgentId: vi.fn(),
  listForms: vi.fn(),
  countTicketsPerForm: vi.fn(),
  listTeam: vi.fn(),
  getWorkspaceEntitlement: vi.fn(),
  stripeConfigured: vi.fn(),
  getSubscriberDetail: vi.fn(),
  listImpersonationSessionsForWorkspace: vi.fn(),
  readsForSessions: vi.fn(),
  exportsForWorkspace: vi.fn(),
  operatorActionsForWorkspace: vi.fn(),
  activeWorkspace: vi.fn(),
  lastArrivals: vi.fn(),
  getAutoReplyConfig: vi.fn(),
}));

const WORKSPACE = {
  id: 3,
  name: "Open Door Bakery",
  accent: "light",
  // The fields /settings reads, in the state of a new workspace: none of the
  // optional business details filled in, which is the one with the warning.
  legalName: null,
  postalAddress: null,
  brandAccentHex: null,
  brandSignOff: null,
  inboundEmail: "open-door-bakery-k3f9@inbound.postbox.help",
};

vi.mock("@/lib/viewer", () => ({
  resolveViewer: async () => ({
    isAdmin: false,
    workspace: WORKSPACE,
    email: "jordan@postbox.help",
    agentEmail: "emma@opendoorbakery.co.uk",
  }),
  // MailNav calls this itself rather than taking the workspace as a prop.
  activeWorkspace: h.activeWorkspace,
}));

vi.mock("next/navigation", () => ({
  // Throws rather than returning: a fixture that lands a page in a state it
  // redirects out of must fail loudly, not write an empty harness page that a
  // later sweep reports as clean.
  redirect: (to: string) => {
    throw new Error(`unexpected redirect to ${to}`);
  },
  notFound: () => {
    throw new Error("unexpected notFound()");
  },
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    refresh: () => {},
    back: () => {},
    forward: () => {},
    prefetch: () => {},
  }),
  usePathname: () => "/inbox",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/search", async () => ({
  ...(await vi.importActual<typeof import("@/lib/search")>("@/lib/search")),
  searchWorkspace: h.searchWorkspace,
}));

vi.mock("../app/(dashboard)/queries", async () => ({
  ...(await vi.importActual<typeof import("../app/(dashboard)/queries")>(
    "../app/(dashboard)/queries",
  )),
  viewerAgentId: h.viewerAgentId,
  activeWorkspace: h.activeWorkspace,
}));

vi.mock("../app/(dashboard)/settings/website/queries", () => ({
  lastArrivals: h.lastArrivals,
}));

vi.mock("@/lib/auto-reply-send", async () => ({
  ...(await vi.importActual<typeof import("@/lib/auto-reply-send")>("@/lib/auto-reply-send")),
  getAutoReplyConfig: h.getAutoReplyConfig,
}));

vi.mock("@/lib/forms", async () => ({
  ...(await vi.importActual<typeof import("@/lib/forms")>("@/lib/forms")),
  listForms: h.listForms,
}));

vi.mock("../app/(dashboard)/settings/forms/queries", () => ({
  countTicketsPerForm: h.countTicketsPerForm,
}));

vi.mock("../app/(dashboard)/settings/team/queries", () => ({
  listTeam: h.listTeam,
}));

vi.mock("@/lib/billing-query", () => ({
  getWorkspaceEntitlement: h.getWorkspaceEntitlement,
}));

vi.mock("@/lib/stripe", async () => ({
  ...(await vi.importActual<typeof import("@/lib/stripe")>("@/lib/stripe")),
  stripeConfigured: h.stripeConfigured,
}));

vi.mock("../app/(dashboard)/subscribers/queries", async () => ({
  ...(await vi.importActual<typeof import("../app/(dashboard)/subscribers/queries")>(
    "../app/(dashboard)/subscribers/queries",
  )),
  getSubscriberDetail: h.getSubscriberDetail,
}));

vi.mock("@/lib/impersonation", async () => ({
  ...(await vi.importActual<typeof import("@/lib/impersonation")>("@/lib/impersonation")),
  listImpersonationSessionsForWorkspace: h.listImpersonationSessionsForWorkspace,
}));

vi.mock("@/lib/impersonation-reads", () => ({
  readsForSessions: h.readsForSessions,
}));

vi.mock("@/lib/admin-audit", async () => ({
  ...(await vi.importActual<typeof import("@/lib/admin-audit")>("@/lib/admin-audit")),
  exportsForWorkspace: h.exportsForWorkspace,
  operatorActionsForWorkspace: h.operatorActionsForWorkspace,
}));

import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import MailNav from "../components/mail/MailNav";
import SearchPage from "../app/(dashboard)/search/page";
import BillingPage from "../app/(dashboard)/settings/billing/page";
import FormsPage from "../app/(dashboard)/settings/forms/page";
import TeamPage from "../app/(dashboard)/settings/team/page";
import SubscriberDetailPage from "../app/(dashboard)/subscribers/[id]/page";
import AccessLogPage from "../app/(dashboard)/settings/access-log/page";
import YourBusinessPage from "../app/(dashboard)/settings/page";
import WebsitePage from "../app/(dashboard)/settings/website/page";
import AutoReplyPage from "../app/(dashboard)/settings/auto-reply/page";
import type { lastArrivals } from "../app/(dashboard)/settings/website/queries";
import type { ImpersonationSession } from "../db/schema";
import type { TeamMember } from "../lib/team";
import type { SubscriberDetail } from "../app/(dashboard)/subscribers/queries";
import type { MailCountsDTO } from "../components/mail/types";
import type { SearchResults } from "../lib/search";
import type { operatorActionsForWorkspace } from "../lib/admin-audit";
import type { Entitlement } from "../lib/trial";
import type { Form } from "../db/schema";
import type { countTicketsPerForm } from "../app/(dashboard)/settings/forms/queries";

/** The real return of countTicketsPerForm, so the fixture cannot drift from it. */
type FormCounts = Awaited<ReturnType<typeof countTicketsPerForm>>;

const OUT = process.env.DASHBOARD_HARNESS_OUT;
const at = (h: number) => new Date(Date.UTC(2026, 8, 6, 11, 20) - h * 3600_000);

/*
  Complete, so it is `satisfies MailCountsDTO` outright rather than the
  Partial-and-assert form. The nav shows every folder, so a partial fixture
  would leave real counters rendering `undefined`.

  The first draft had `mine: 8` and no `sent` or `archived`. There is no `mine`
  in this type and never has been; tsc named it the moment the fixture said
  what it was, which is the entire argument for saying so.
*/
// The two tab counts since the simple inbox (19 Nov 2026).
const counts = {
  inbox: 12,
  closed: 96,
} satisfies MailCountsDTO;

const seg = (text: string, hit = false) => ({ text, hit });

type Rendered = [name: string, html: string];
const rendered: Rendered[] = [];
const record = (name: string, html: string) => {
  rendered.push([name, html]);
  return html;
};

/*
  Two stylesheets and a shell wrapper, because these pages are LAID OUT by the
  dashboard layout rather than by themselves. Rendering one bare would put it
  at the document's full width with no navigation column, and every reflow and
  target reading would be taken against a page that does not ship.

  The `.pbm` scope is not decoration either: it declares --pbm-on-dark,
  --pbm-nav-line and --pbm-scrim. Without it those resolve to nothing, an
  undefined var() invalidates the whole declaration, and the Send button once
  measured as dark ink on purple because of exactly this.
*/
function page(title: string, body: string, sheets: string[]) {
  const links = sheets.map((s) => `<link rel="stylesheet" href="./${s}">`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<script>
  var t = new URLSearchParams(location.search).get("theme");
  if (t) document.documentElement.setAttribute("data-theme", t);
</script>
${links}
<style>
  body { margin: 0; font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif; }
</style>
</head><body><div class="pb-shell pbm">${body}</div>
<script src="./audit.js"></script></body></html>`;
}

describe("the signed-in screens that had no harness", () => {
  it("MailNav — the navigation column on every signed-in page", async () => {
    h.activeWorkspace.mockResolvedValue(WORKSPACE);
    h.getWorkspaceEntitlement.mockResolvedValue(null);

    const html = record(
      "nav",
      renderToStaticMarkup(
        await MailNav({
          workspaceName: "Open Door Bakery",
          userLabel: "emma@opendoorbakery.co.uk",
          counts,
          isAdmin: false,
        }),
      ),
    );
    // Canaries. A nav that rendered its chrome but lost every link would still
    // be long enough to pass a length check.
    expect(html).toContain("Open Door Bakery");
    // The three rows of the simple nav (19 Nov 2026: Subscribers became the
    // People tab inside Newsletter), and nothing of the eleven folders or
    // the labels block it replaced.
    for (const row of ["Inbox", "Newsletter", "Settings"]) {
      expect(html).toContain(`>${row}<`);
    }
    for (const gone of ["Subscribers", "All mail", "Awaiting reply", "Starred", "Trash", "Labels"]) {
      expect(html, `the nav still shows "${gone}"`).not.toContain(`>${gone}<`);
    }
    expect(html.length).toBeGreaterThan(1500);
  });

  it("/search — with results, and with a query too short to run", async () => {
    h.viewerAgentId.mockResolvedValue(11);
    h.searchWorkspace.mockResolvedValue({
      query: "order",
      terms: ["order"],
      tooShort: false,
      total: 4,
      tickets: {
        total: 2,
        items: [
          {
            id: 41,
            ref: "ORD-4821",
            subject: [seg("ORD-4821 arrived "), seg("damaged", true)],
            customerName: [seg("Marcus Bell")],
            customerEmail: [seg("marcus@example.com")],
            source: "order",
            status: "open",
            orderId: "ORD-4821",
            updatedAt: at(9),
            matchedIn: ["Subject", "Order ID"],
          },
        ],
      },
      messages: {
        total: 1,
        items: [
          {
            id: 88,
            ticketId: 41,
            ref: "ORD-4821",
            subject: "ORD-4821 arrived damaged",
            customerName: "Marcus Bell",
            direction: "inbound",
            status: "open",
            sentAt: at(9),
            snippet: [seg("two of the large boxes were crushed on the "), seg("order", true)],
          },
        ],
      },
      contacts: {
        total: 1,
        items: [
          {
            id: 5,
            name: [seg("Marcus Bell")],
            email: [seg("marcus@example.com")],
            rawEmail: "marcus@example.com",
            firstSeen: at(900),
            ticketCount: 3,
          },
        ],
      },
    } satisfies SearchResults);

    const html = record(
      "search",
      renderToStaticMarkup(await SearchPage({ searchParams: Promise.resolve({ q: "order" }) })),
    );
    expect(html).toContain("Marcus Bell");
    expect(html.length).toBeGreaterThan(1000);
  });

  it("/settings/billing — on a trial, with Stripe not configured", async () => {
    /*
      The state production is actually in. Stripe has no keys set, so checkout
      returns 503 by design, and this page is what a client sees meanwhile —
      which makes "Stripe not configured" the honest default for the fixture
      rather than an edge case worth a second look.
    */
    h.stripeConfigured.mockReturnValue(false);
    h.getWorkspaceEntitlement.mockResolvedValue({
      plan: "trial",
      onTrial: true,
      comped: false,
      mayReceive: true,
      maySendCampaigns: true,
      daysLeft: 6,
      blockedReason: null,
    } satisfies Entitlement);
    const html = record("billing", renderToStaticMarkup(await BillingPage()));
    // 563 chars since 9 Sep 2026, when the two explanatory paragraphs came
    // off the page. The bar is "rendered a page", not "rendered the prose".
    expect(html.length).toBeGreaterThan(400);
  });

  it("/settings/forms", async () => {
    h.listForms.mockResolvedValue([
      { id: 1, workspaceId: 3, name: "Contact form", key: "pbk_live_abc123", createdAt: at(900) },
      // Unpublished: key is nullable precisely so a form can exist before it
      // has one, and that renders a different row.
      { id: 2, workspaceId: 3, name: "Wholesale enquiries", key: null, createdAt: at(40) },
    ] satisfies Form[]);
    /*
      `{ byForm, unattributed }`, not a bare Map.

      The first draft passed `new Map([[1, 87]])` and the page died on
      `counts.byForm.get` — undefined. Typecheck did NOT catch it, because a
      bare vi.fn() takes `any`, which is the same blind spot `as never` opens.
      The `satisfies` is what makes the fixture answerable to the real
      signature, and it is why every fixture in this file carries one.
    */
    h.countTicketsPerForm.mockResolvedValue({
      byForm: new Map([[1, 87]]),
      // Contact-form tickets that arrived on the workspace key rather than a
      // form's own — the row this page exists to explain.
      unattributed: 12,
    } satisfies FormCounts);
    const html = record("forms", renderToStaticMarkup(await FormsPage()));
    expect(html).toContain("Contact form");
  });

  it("/settings/team — an owner, a member, and somebody still pending", async () => {
    h.getWorkspaceEntitlement.mockResolvedValue({
      plan: "starter",
      onTrial: false,
      comped: false,
      mayReceive: true,
      maySendCampaigns: true,
      daysLeft: null,
      blockedReason: null,
    } satisfies Entitlement);
    h.listTeam.mockResolvedValue([
      { id: 1, email: "emma@opendoorbakery.co.uk", pending: false, role: "owner" },
      { id: 2, email: "sam@opendoorbakery.co.uk", pending: false, role: "member" },
      // Invited, never signed in — the row with the different affordances.
      { id: 3, email: "newstarter@opendoorbakery.co.uk", pending: true, role: "member" },
    ] satisfies TeamMember[]);
    const html = record(
      "team",
      renderToStaticMarkup(await TeamPage({ searchParams: Promise.resolve({}) })),
    );
    expect(html).toContain("emma@opendoorbakery.co.uk");
    // Three people on Starter's one seat: over the plan, so no Add button
    // and the reason is said instead.
    expect(html).not.toContain("Add new member");
  });

  it("/settings/team with a free seat — Add new member, and its modal", async () => {
    // Growth: three seats, one taken. (Starter has one.)
    h.getWorkspaceEntitlement.mockResolvedValue({
      plan: "growth",
      onTrial: false,
      comped: false,
      mayReceive: true,
      maySendCampaigns: true,
      daysLeft: null,
      blockedReason: null,
    } satisfies Entitlement);
    h.listTeam.mockResolvedValue([
      { id: 1, email: "emma@opendoorbakery.co.uk", pending: false, role: "owner" },
    ] satisfies TeamMember[]);
    /*
      The invite is the shared modal, a native <dialog> that Modal.tsx opens
      with showModal() in an effect, which static markup never runs. Written
      with the open attribute so the probes measure the modal itself.
    */
    const html = record(
      "team-invite",
      renderToStaticMarkup(await TeamPage({ searchParams: Promise.resolve({}) })).replace(
        /<dialog class="pb-modal/g,
        '<dialog open class="pb-modal',
      ),
    );
    expect(html).toContain("Add new member");
    expect(html).toContain('name="email"');
  });

  it("/subscribers/[id] — the consent screen, on a weak consent record", async () => {
    /*
      A subscriber whose consent method is `import`, which
      WEAK_CONSENT_METHODS names — so this renders the warning state rather
      than the tidy one. That is the whole reason the screen exists, and a
      fixture with clean consent would render the page nobody opens.
    */
    h.getSubscriberDetail.mockResolvedValue({
      subscriber: {
        id: 9,
        workspaceId: 3,
        email: "margarethe.vandenberg-whitmore@averylongdomainname.example.co.uk",
        name: "Margarethe Van Der Berg-Whitmore",
        status: "subscribed",
        subscribedAt: at(2000),
        unsubscribedAt: null,
        source: "import",
        consentMethod: "import",
        consentAt: at(2000),
        consentSource: "Mailchimp export, March 2026",
        createdAt: at(2000),
        /*
          Null, and deliberately so. An imported address has no IP because
          nobody watched it being typed — which is exactly what makes the
          consent weak, and this screen has to be able to say so with the
          field empty rather than only when it is filled.
        */
        consentIp: null,
      },
      lists: [{ id: 1, name: "Bakery news" }],
      suppression: null,
    } satisfies SubscriberDetail);
    const html = record(
      "subscriber",
      renderToStaticMarkup(
        await SubscriberDetailPage({ params: Promise.resolve({ id: "9" }) }),
      ),
    );
    expect(html).toContain("Margarethe");
  });

  it("/settings/access-log — what Postbox looked at, shown to the client", async () => {
    /*
      Two visits: one closed cleanly, one still open. The open row is the one
      that matters — it is the state a client would most want to understand,
      and `endedAt: null` drives a different rendering than a finished visit.

      The chain fields are carried because this screen's whole subject is that
      the log is tamper-evident; a fixture that dropped them would be the exact
      omission found on the admin access log on 6 Sep.
    */
    h.listImpersonationSessionsForWorkspace.mockResolvedValue([
      {
        id: 51,
        adminId: 1,
        adminEmail: "jordan@postbox.help",
        adminClerkUserId: "user_abc",
        workspaceId: 3,
        workspaceName: "Open Door Bakery",
        reason: "Customer reported a reply that never arrived",
        startedAt: at(26),
        lastSeenAt: at(25),
        endedAt: at(25),
        endedReason: "signed_out",
        chainPrevHash: null,
        chainHash: "a91f3c0e5d7b",
      },
      {
        id: 52,
        adminId: 1,
        adminEmail: "jordan@postbox.help",
        adminClerkUserId: "user_abc",
        workspaceId: 3,
        workspaceName: "Open Door Bakery",
        reason: null,
        startedAt: at(2),
        lastSeenAt: at(1),
        // Never closed cleanly — read with lastSeenAt, not instead of it.
        endedAt: null,
        endedReason: null,
        chainPrevHash: "a91f3c0e5d7b",
        chainHash: "c4e70b12aa38",
      },
    ] satisfies ImpersonationSession[]);
    h.readsForSessions.mockResolvedValue(
      new Map([[51, [{ ticketId: 41, count: 2, firstAt: at(26), lastAt: at(25) }]]]),
    );
    h.exportsForWorkspace.mockResolvedValue([
      { id: 7, actorEmail: "jordan@postbox.help", createdAt: at(300) },
    ]);
    // What staff did while in (21 Nov 2026): a reply, and one with no detail.
    h.operatorActionsForWorkspace.mockResolvedValue([
      {
        id: 9,
        action: "operator_replied",
        actorEmail: "jordan@postbox.help",
        detail: "Replied in conversation TKT-41",
        createdAt: at(25),
      },
      {
        id: 8,
        action: "operator_settings_changed",
        actorEmail: "jordan@postbox.help",
        detail: null,
        createdAt: at(27),
      },
    ] satisfies Awaited<ReturnType<typeof operatorActionsForWorkspace>>);
    const html = record("access-log", renderToStaticMarkup(await AccessLogPage()));
    expect(html).toContain("jordan@postbox.help");
    expect(html).toContain("Things Postbox staff did here");
    expect(html).toContain("Replied to a customer");
    expect(html).toContain("Replied in conversation TKT-41");
  });

  it("/settings — Your business, a new workspace with nothing optional filled in", async () => {
    const html = record("your-business", renderToStaticMarkup(await YourBusinessPage()));
    expect(html).toContain("Your business");
    expect(html).toContain("Not added yet");
    expect(html).toContain("You’ll need this before you send a newsletter.");
  });

  it("/settings/website — a form that has delivered, a sign-up that has not", async () => {
    h.lastArrivals.mockResolvedValue({
      contactForm: new Date(Date.now() - 26 * 3600_000),
      signup: null,
    } satisfies Awaited<ReturnType<typeof lastArrivals>>);
    const html = record("website", renderToStaticMarkup(await WebsitePage()));
    expect(html).toContain("Connected");
    expect(html).toContain("Last one: 1 day ago.");
    expect(html).toContain("Ready to add");
    expect(html).toContain(WORKSPACE.inboundEmail);
    expect(html).toContain('href="/api/workspace/export"');
  });

  it("/settings/auto-reply — never set up, so the defaults", async () => {
    h.getAutoReplyConfig.mockResolvedValue(null);
    const html = record("auto-reply", renderToStaticMarkup(await AutoReplyPage()));
    expect(html).toContain("Auto-reply is off");
    expect(html).toContain("Turn on");
    expect(html).toContain("Every new message, any time");
  });

  it("/settings/billing — comped, no card payments: the state the design draws", async () => {
    h.stripeConfigured.mockReturnValue(false);
    h.getWorkspaceEntitlement.mockResolvedValue({
      plan: "trial",
      onTrial: false,
      comped: true,
      mayReceive: true,
      maySendCampaigns: true,
      daysLeft: null,
      blockedReason: null,
    } satisfies Entitlement);
    const html = record("billing-comped", renderToStaticMarkup(await BillingPage()));
    expect(html).toContain(">Free<");
    expect(html).toContain("Not set up yet");
    expect(html).toContain('href="/contact"');
    expect(html).toContain("Close workspace");
  });

  it("/settings/billing — paying by card, Stripe configured", async () => {
    h.stripeConfigured.mockReturnValue(true);
    h.getWorkspaceEntitlement.mockResolvedValue({
      plan: "growth",
      onTrial: false,
      comped: false,
      mayReceive: true,
      maySendCampaigns: true,
      daysLeft: null,
      blockedReason: null,
    } satisfies Entitlement);
    const html = record("billing-paying", renderToStaticMarkup(await BillingPage()));
    expect(html).toContain("Paid monthly by card");
    expect(html).toContain("Manage");
  });

  it("writes the browser harness when asked", () => {
    expect(rendered.length).toBeGreaterThanOrEqual(10);
    if (!OUT) return;
    mkdirSync(OUT, { recursive: true });
    const sheets = [
      "app/globals.css",
      "app/mail.css",
      "app/settings.css",
      "app/subscribers.css",
      "app/(dashboard)/settings/forms/forms.css",
    ];
    for (const src of sheets) {
      copyFileSync(join(process.cwd(), src), join(OUT, src.split("/").pop()!));
    }
    copyFileSync(join(process.cwd(), "tests/audit-probes.js"), join(OUT, "audit.js"));
    const names = sheets.map((s) => s.split("/").pop()!);
    for (const [name, html] of rendered) {
      writeFileSync(join(OUT, `${name}.html`), page(name, html, names), "utf8");
    }
  });
});
