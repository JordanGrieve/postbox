// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import MarketingMenu from "../components/marketing/MarketingMenu";

/**
 * The phone menu on the public pages (21 Nov 2026). Jordan: "how are people
 * supposed to get to the other pages on mobile? there needs to be a burger
 * menu, and move the buttons that are on the nav bar into there at the
 * bottom." What has to hold is what a keyboard or screen-reader user needs
 * from a disclosure that covers the screen.
 */

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

// What MarketingNav passes (TRIAL_HREF / TRIAL_CTA in lib/marketing-copy.ts).
const TRIAL = { trialHref: "/sign-up", trialLabel: "Start free trial" };

const burger = () => screen.getByRole("button", { name: /menu/i });
const panel = () => document.querySelector<HTMLElement>(".home-menu")!;

describe("MarketingMenu", () => {
  /*
    Closed, the panel stays in the DOM so it can animate (21 Nov 2026), so
    "closed" is asserted as what makes it unreachable: inert, and the
    data-open the stylesheet hides it by.
  */
  const isClosed = () => panel().hasAttribute("inert") && panel().dataset.open === "false";

  it("starts closed, with the panel unreachable and the burger saying so", () => {
    render(<MarketingMenu {...TRIAL} />);
    expect(burger().getAttribute("aria-expanded")).toBe("false");
    expect(burger().getAttribute("aria-label")).toBe("Open menu");
    expect(isClosed()).toBe(true);
    expect(burger().getAttribute("aria-controls")).toBe(panel().id);
  });

  it("opens to the three pages and both buttons, with focus in the menu", () => {
    render(<MarketingMenu current="pricing" {...TRIAL} />);
    fireEvent.click(burger());
    expect(burger().getAttribute("aria-expanded")).toBe("true");
    expect(burger().getAttribute("aria-label")).toBe("Close menu");
    expect(panel().hasAttribute("inert")).toBe(false);
    expect(panel().dataset.open).toBe("true");

    const links = [...panel().querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")]);
    expect(links).toEqual([
      ["Features", "/#features"],
      ["Pricing", "/pricing"],
      ["Contact", "/contact"],
      ["Sign in", "/sign-in"],
      ["Start free trial", "/sign-up"],
    ]);
    // The buttons sit at the bottom, after the page links.
    expect(panel().lastElementChild?.className).toBe("home-menu-actions");
    expect(panel().querySelector('[aria-current="page"]')?.textContent).toBe("Pricing");
    // Focus is on the panel itself, so the next Tab is Features.
    expect(document.activeElement).toBe(panel());
    expect(panel().querySelector("a")?.textContent).toBe("Features");
    // The page behind does not scroll under a full-screen menu.
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes on Escape and gives focus back to the burger", () => {
    render(<MarketingMenu {...TRIAL} />);
    fireEvent.click(burger());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(isClosed()).toBe(true);
    expect(document.activeElement).toBe(burger());
    expect(document.body.style.overflow).toBe("");
  });

  it("closes when a link is followed", () => {
    render(<MarketingMenu {...TRIAL} />);
    fireEvent.click(burger());
    fireEvent.click(screen.getByText("Features"));
    expect(isClosed()).toBe(true);
  });

  it("animates: closed and open are styled states, not removal", () => {
    // The panel is never unmounted or display:none'd by the component; the
    // stylesheet moves it between data-open states with a 220ms transition.
    const css = readFileSync(join(process.cwd(), "app/home.css"), "utf8");
    const at = css.indexOf(".home-menu {");
    const rule = css.slice(at, css.indexOf("}", at));
    expect(rule).toMatch(/transition:[\s\S]*opacity 220ms/);
    expect(rule).toMatch(/visibility 0s linear 220ms/);
    expect(css).toContain('.home-menu[data-open="true"]');
    expect(css).toMatch(/\.home-burger\[aria-expanded="true"\] \.home-burger-bar:nth-child\(1\)/);
  });

  it("renders the panel into <body>, outside the sticky bar", () => {
    const { container } = render(<MarketingMenu {...TRIAL} />);
    // The bar's backdrop-filter would make a fixed panel inside it fixed to
    // the bar; portalled, it is a direct child of body.
    expect(container.querySelector(".home-menu")).toBeNull();
    expect(panel().parentElement).toBe(document.body);
  });
});
