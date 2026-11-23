// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/", search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));
import { render, screen, cleanup } from "@testing-library/react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { existsSync } from "node:fs";
import CardSkeleton from "../components/skeletons/CardSkeleton";
import CentredSkeleton from "../components/skeletons/CentredSkeleton";
import AppGround from "../components/skeletons/AppGround";
import NewslettersLoading from "../app/(dashboard)/newsletters/loading";

/**
 * Every page has a skeleton, and every skeleton renders.
 *
 * ── TWO DIFFERENT CLAIMS, BOTH WORTH PINNING ──
 * The build proves a loading.tsx COMPILES. It does not prove the component
 * renders without throwing, and it does not prove a route has one at all —
 * loading.tsx is convention-based, so a file in the wrong directory is silently
 * inert rather than an error.
 *
 * So this walks the route tree for the first, and renders each shared skeleton
 * for the second.
 */

afterEach(cleanup);

const APP = join(process.cwd(), "app");

/** Every directory containing a page.tsx. */
function routeDirs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    routeDirs(full, out);
  }
  if (readdirSync(dir).includes("page.tsx")) out.push(dir);
  return out;
}

/** Does this route, or any segment above it, provide a loading.tsx? */
function coveredBy(dir: string): string | null {
  let at = dir;
  for (;;) {
    if (readdirSync(at).includes("loading.tsx")) return at;
    if (at === APP) return null;
    at = join(at, "..");
  }
}

describe("every route has a skeleton", () => {
  const routes = routeDirs(APP);
  const rel = (dir: string) => dir.slice(APP.length).replace(/\\/g, "/") || "/";

  it("found the routes at all", () => {
    // The canary: a walker that returned nothing would make the loop below
    // pass by iterating over an empty list.
    expect(routes.length).toBeGreaterThan(20);
  });

  /*
    ── THE STATIC PAGES HAVE NO BOUNDARY AT ALL (21 Nov 2026) ──
    These are prerendered and served from the CDN, so they never wait. A
    loading.tsx above them is not harmless: React splits a large page around
    the boundary, so the homepage, pricing and privacy shipped their skeleton
    first and their real content in a hidden block revealed by script — the
    render delay Lighthouse measured on the homepage. They must have NO
    loading.tsx above them, root included, and must stay static (below).
  */
  const STATIC_ROUTES = [
    "/",
    "/pricing",
    "/contact",
    "/(legal)/privacy",
    "/(legal)/terms",
    "/s/done",
    // The guide pages (lib/guides.ts), 23 Nov 2026.
    "/shared-inbox",
    "/contact-form-to-inbox",
    "/newsletters-for-small-business",
    "/faq",
    "/vs/gmail",
    "/vs/help-scout",
    "/vs/mailchimp",
  ];

  it("the root has no loading.tsx", () => {
    expect(existsSync(join(APP, "loading.tsx"))).toBe(false);
  });

  for (const route of STATIC_ROUTES) {
    it(`${route} has no boundary above it, and stays static`, () => {
      const dir = join(APP, ...route.split("/").filter(Boolean));
      expect(routes, `${route} is not a route`).toContain(dir);
      expect(coveredBy(dir), `${route} has a loading.tsx above it`).toBeNull();
      // Anything that reads the request would make it dynamic, and a dynamic
      // page with no boundary shows nothing while it waits.
      const code = readFileSync(join(dir, "page.tsx"), "utf8").replace(
        /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
        "",
      );
      expect(code, `${route} reads the request`).not.toMatch(
        /\bauth\(\)|\bcookies\(\)|\bheaders\(\)|searchParams|force-dynamic|connection\(\)/,
      );
    });
  }

  /*
    ── "IS IT COVERED" IS THE WRONG QUESTION ──
    Every other route must have a loading.tsx of its OWN section, not merely
    some boundary somewhere above it. When the root had one, "is it covered"
    could not fail. A route that fell through to a distant skeleton renders a
    placeholder for a different page and then swaps the whole screen, which
    is worse than none.
  */
  for (const dir of routes) {
    const label = rel(dir);
    if (STATIC_ROUTES.includes(label)) continue;
    it(`${label} has its own skeleton`, () => {
      const cover = coveredBy(dir);
      expect(cover, `${label} has no loading.tsx above it`).not.toBeNull();
      expect(rel(cover!), `${label} falls through to the root`).not.toBe("/");
      /*
        The same argument one level down. settings/loading.tsx draws the
        General tab — a six-card theme grid — and on 8 Sep 2026 five of its
        sibling tabs were borrowing it: Labels flashed a grid of colour
        swatches and then replaced them with a list of rows. "Not the root
        fallback" was true and not enough. Every settings tab draws its own.
      */
      if (label.startsWith("/settings/")) {
        expect(rel(cover!), `${label} borrows the General tab's skeleton`).toBe(label);
      }
    });
  }
});

describe("the shared skeletons render", () => {
  it("CardSkeleton, for the subscribe and unsubscribe flows", () => {
    render(<CardSkeleton prefix="s" lines={3} button label="Loading" />);
    const box = screen.getByLabelText("Loading");
    expect(box.getAttribute("aria-busy")).toBe("true");
    // A card, and bars inside it — not an empty shell.
    expect(box.className).toContain("s-card");
    expect(box.querySelectorAll(".pbk-text").length).toBeGreaterThan(3);
    expect(box.querySelector(".s-button")).toBeTruthy();
  });

  it("CardSkeleton omits the button when the real page has none", () => {
    render(<CardSkeleton prefix="u" lines={2} label="Loading" />);
    expect(screen.getByLabelText("Loading").querySelector(".u-button")).toBeNull();
  });

  it("CentredSkeleton, for sign-in and no-access", () => {
    render(<CentredSkeleton label="Loading sign in" height={380} />);
    const box = screen.getByLabelText("Loading sign in");
    expect(box.querySelectorAll(".pbk-fill").length).toBeGreaterThan(1);
  });

  it("AppGround, while a signed-in layout resolves the viewer", () => {
    render(<AppGround label="Loading your inbox" />);
    const box = screen.getByLabelText("Loading your inbox");
    expect(box.getAttribute("role")).toBe("status");
    // The bare ground: no marketing chrome flashing before the inbox.
    expect(box.querySelector(".home-nav")).toBeNull();
  });
});

/*
  ── THE SIGNED-IN LAYOUTS OWN THEIR WAITING ──
  A loading.tsx does not wrap the layout in its own folder, so nothing under
  (dashboard) or (admin) can cover those layouts while they await the viewer.
  That used to be the root app/loading.tsx; since 21 Nov 2026 each layout
  wraps the part that waits in its own Suspense, with AppGround as the
  fallback, and the root has no boundary to split the marketing pages around.
*/
describe("the signed-in layouts own their waiting", () => {
  for (const [name, file, shell] of [
    ["dashboard", "app/(dashboard)/layout.tsx", "DashboardShell"],
    ["admin console", "app/(admin)/layout.tsx", "AdminShell"],
  ] as const) {
    it(`the ${name} layout waits inside its own boundary`, () => {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      // The exported layout does not wait; the shell inside the boundary does.
      expect(src).toMatch(/export default function \w+Layout/);
      expect(src).toMatch(/<Suspense fallback=\{<AppGround /);
      expect(src).toContain(`<${shell}>`);
      expect(src).toMatch(new RegExp(`async function ${shell}`));
    });
  }
});

/*
  /newsletters has two tabs with different rows, and a server loading.tsx is
  not given the query string. Until 21 Nov 2026 ?tab=people loaded with
  newsletter rows; the rows now come from a client piece that reads it.
*/
describe("the newsletters skeleton follows the tab", () => {
  it("draws newsletter rows by default", () => {
    nav.search = "";
    const { container } = render(<NewslettersLoading />);
    expect(container.querySelector(".nl-ov-list")).toBeTruthy();
    expect(container.querySelector(".psb-list")).toBeNull();
  });

  it("draws the People filters and person rows on ?tab=people", () => {
    nav.search = "tab=people";
    const { container } = render(<NewslettersLoading />);
    expect(container.querySelector(".psb-filters")).toBeTruthy();
    expect(container.querySelectorAll(".psb-row").length).toBeGreaterThan(0);
    expect(container.querySelector(".nl-ov-list")).toBeNull();
    nav.search = "";
  });
});

describe("CentredSkeleton's message shape, for /no-access", () => {
  it("draws a heading, a paragraph, the request form and a button, and no card", () => {
    render(<CentredSkeleton label="Loading" message />);
    const box = screen.getByLabelText("Loading");
    // Lockup mark, the form's two fields and its Send request, and Sign out:
    // five filled boxes, none of them the old 200px card.
    const fills = [...box.querySelectorAll<HTMLElement>(".pbk-fill")];
    expect(fills.length).toBe(5);
    expect(fills.every((f) => parseFloat(f.style.height || "0") <= 96)).toBe(true);
    expect(box.querySelector(".stg-button")).toBeTruthy();
    // Heading, four paragraph lines, two field labels and the wordmark.
    expect(box.querySelectorAll(".pbk-text").length).toBeGreaterThanOrEqual(8);
  });
});

describe("skeletons are hidden from assistive technology", () => {
  /*
    A screen reader must hear "busy", once, and not a tree of empty bars. Each
    of these puts aria-busy on the root and aria-hidden on everything inside;
    without the second, the placeholder is announced as a pile of blank
    elements while the real content is still arriving.
  */
  const cases = [
    ["card", <CardSkeleton key="c" prefix="s" lines={2} label="L" />],
    ["centred", <CentredSkeleton key="n" label="L" />],
    ["app ground", <AppGround key="g" label="L" />],
  ] as const;

  for (const [name, node] of cases) {
    it(`${name} marks its contents aria-hidden`, () => {
      render(node);
      const root = screen.getByLabelText("L");
      expect(root.getAttribute("aria-busy")).toBe("true");
      expect(root.querySelector("[aria-hidden]")).toBeTruthy();
    });
  }
});

describe("the generated loading files point somewhere real", () => {
  it("every loading.tsx imports something that exists", () => {
    /*
      Thirteen of these were generated from a script, so a typo in an import
      path would have been copied thirteen times. The build would catch it —
      but only if the route is reachable, and a loading.tsx in the wrong place
      is never built at all.
    */
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (entry === "loading.tsx") {
          const src = readFileSync(full, "utf8");
          for (const m of src.matchAll(/from "@\/([^"]+)"/g)) {
            const target = join(process.cwd(), m[1]!);
            const exists = [".tsx", ".ts", ""].some((ext) => {
              try {
                statSync(target + ext);
                return true;
              } catch {
                return false;
              }
            });
            if (!exists) bad.push(`${full} -> ${m[1]}`);
          }
        }
      }
    };
    walk(APP);
    expect(bad).toEqual([]);
  });
});
