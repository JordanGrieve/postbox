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
import CardSkeleton from "../components/skeletons/CardSkeleton";
import ProseSkeleton from "../components/skeletons/ProseSkeleton";
import CentredSkeleton from "../components/skeletons/CentredSkeleton";
import MarketingSkeleton from "../components/skeletons/MarketingSkeleton";
import RootLoading from "../app/loading";
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
    ── "IS IT COVERED" IS THE WRONG QUESTION ──
    The first version of this asked only whether SOME loading.tsx sat above
    each route. app/loading.tsx does, for all of them, so the check could not
    fail — it would have passed just as happily with the other 25 files
    deleted. That is the same shape of dead guard this repo has been bitten by
    before, and it is worth the extra few lines to avoid it.

    So it asserts the NEAREST one instead. The root file draws the marketing
    skeleton on "/" — a nav, a hero and a product shot — and only a blank
    ground anywhere else (see "the root boundary" below). A dashboard or legal route
    that fell through to it would render a placeholder for a completely
    different page and then swap the whole screen, which is worse than no
    skeleton at all. Only the homepage may use it.
  */
  for (const dir of routes) {
    const label = rel(dir);
    it(`${label} has its own skeleton, not the marketing fallback`, () => {
      const cover = coveredBy(dir);
      expect(cover, `${label} has no loading.tsx above it`).not.toBeNull();
      if (label !== "/") {
        expect(rel(cover!), `${label} falls through to the marketing skeleton`).not.toBe("/");
      }
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

  it("ProseSkeleton, for the legal pages", () => {
    render(<ProseSkeleton label="Loading the privacy policy" />);
    const box = screen.getByLabelText("Loading the privacy policy");
    expect(box.querySelectorAll(".pbk-text").length).toBeGreaterThan(6);
  });

  it("CentredSkeleton, for sign-in and no-access", () => {
    render(<CentredSkeleton label="Loading sign in" height={380} />);
    const box = screen.getByLabelText("Loading sign in");
    expect(box.querySelectorAll(".pbk-fill").length).toBeGreaterThan(1);
  });

  it("MarketingSkeleton, for the homepage", () => {
    render(<MarketingSkeleton label="Loading Postbox" lines={3} block={280} />);
    const box = screen.getByLabelText("Loading Postbox");
    // Wears the real nav and hero-band classes, so it lands where the page
    // will. (It drew plain bars in .home-wrap with no band until 21 Nov 2026.)
    expect(box.querySelector(".home-nav")).toBeTruthy();
    expect(box.querySelector(".home-hero .home-hero-inner")).toBeTruthy();
    expect(box.querySelector(".home-shot")).toBeTruthy();
  });
});

/*
  ── THE ROOT BOUNDARY COVERS THE APP'S LAYOUTS, NOT ONLY "/" ──
  A loading.tsx does not wrap the layout in its own folder, so nothing under
  (dashboard) or (admin) can cover those layouts while they await the viewer.
  app/loading.tsx is the boundary that shows then. Until 21 Nov 2026 it drew
  the marketing homepage for every path, so a cold /inbox flashed the public
  nav and hero first.
*/
describe("the root boundary", () => {
  it("draws the homepage on /", () => {
    nav.pathname = "/";
    render(<RootLoading />);
    const box = screen.getByLabelText("Loading Postbox");
    expect(box.querySelector(".home-nav")).toBeTruthy();
    expect(box.querySelector(".home-hero")).toBeTruthy();
  });

  for (const path of ["/inbox", "/tickets/5", "/admin", "/settings/team"]) {
    it(`draws no marketing chrome on ${path}`, () => {
      nav.pathname = path;
      const { container } = render(<RootLoading />);
      expect(container.querySelector("[aria-busy='true']")).toBeTruthy();
      expect(container.querySelector(".home-nav")).toBeNull();
      expect(container.querySelector(".home-hero")).toBeNull();
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
  it("draws a heading, a paragraph and a button, and no card", () => {
    render(<CentredSkeleton label="Loading" message />);
    const box = screen.getByLabelText("Loading");
    // Lockup mark and the button are the only filled boxes; no 200px card.
    const fills = [...box.querySelectorAll<HTMLElement>(".pbk-fill")];
    expect(fills.length).toBe(2);
    expect(box.querySelector(".stg-button")).toBeTruthy();
    expect(box.querySelectorAll(".pbk-text").length).toBeGreaterThanOrEqual(5);
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
    ["prose", <ProseSkeleton key="p" label="L" />],
    ["centred", <CentredSkeleton key="n" label="L" />],
    ["marketing", <MarketingSkeleton key="m" label="L" />],
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
