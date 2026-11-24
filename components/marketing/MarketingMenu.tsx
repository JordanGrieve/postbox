"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/** Nothing to subscribe to: "is this the browser" never changes once true. */
const noSubscription = () => () => {};

/**
 * The phone menu on the public pages (21 Nov 2026).
 *
 * Up to 720px the bar's Features / Pricing / Contact links are hidden, and
 * until this the only things left in it were two buttons — no way to reach
 * pricing or the contact page from a phone except by scrolling to the footer.
 * Jordan: "there needs to be a burger menu, and move the buttons that are on
 * the nav bar into there at the bottom, make it take 100vw."
 *
 * A disclosure, not a modal dialog: a button with aria-expanded controlling a
 * region. What it adds for keyboard and screen-reader users:
 *  - focus moves into the menu when it opens (onto the panel itself, so the
 *    next Tab is Features and a tap does not draw a focus box round it), and
 *    back to the burger when it closes, so nobody is left on a control that
 *    disappeared;
 *  - closed, the panel is `inert` and visibility: hidden — it stays in the DOM
 *    only so it has something to animate from (21 Nov 2026), and must not be
 *    reachable by Tab or a screen reader while it is invisible;
 *  - Escape closes it;
 *  - the page behind stops scrolling while it covers the screen;
 *  - following a link closes it (a same-page link like /#features would
 *    otherwise leave it open over the section it went to);
 *  - widening the window past the phone width closes it.
 *
 * Styles in app/home.css, "the phone menu".
 */
export default function MarketingMenu({
  current,
  trialHref,
  trialLabel,
}: {
  current?: "home" | "pricing" | "contact";
  /*
    Passed in, not imported: lib/marketing-copy reads lib/config, which is
    server-only, and this is a client component. MarketingNav (a server
    component) hands over the same TRIAL_HREF / TRIAL_CTA the bar uses.
  */
  trialHref: string;
  trialLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const burgerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Only return focus to the burger after the menu was open, not on mount.
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      panelRef.current?.focus();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      const wide = window.matchMedia("(min-width: 721px)");
      const onWide = () => {
        if (wide.matches) setOpen(false);
      };
      document.addEventListener("keydown", onKey);
      wide.addEventListener("change", onWide);
      return () => {
        document.body.style.overflow = previous;
        document.removeEventListener("keydown", onKey);
        wide.removeEventListener("change", onWide);
      };
    }
    if (wasOpen.current) burgerRef.current?.focus();
  }, [open]);

  const close = () => setOpen(false);

  /*
    The panel is portalled to <body>. The bar it opens from is sticky with a
    backdrop-filter, and a backdrop-filter makes an element the containing
    block for fixed-position descendants — so a "fixed, full screen" panel
    inside the bar would be fixed to the BAR, 84px tall. It is only ever shown
    after a tap, so rendering it once mounted costs nothing.

    "Mounted" via useSyncExternalStore, the pattern the rest of the codebase
    uses (TrialBannerDismiss.tsx): false on the server and in the hydration
    pass, true after, with no setState inside an effect.
  */
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  const panel = (
      <div
        ref={panelRef}
        id={menuId}
        className="home-menu"
        data-open={open}
        inert={!open}
        tabIndex={-1}
      >
        <nav className="home-menu-links" aria-label="Menu">
          <Link prefetch={false} className="home-menu-link" href="/#features" onClick={close}>
            Features
          </Link>
          <Link prefetch={false}
            className="home-menu-link"
            href="/pricing"
            aria-current={current === "pricing" ? "page" : undefined}
            onClick={close}
          >
            Pricing
          </Link>
          <Link prefetch={false}
            className="home-menu-link"
            href="/contact"
            aria-current={current === "contact" ? "page" : undefined}
            onClick={close}
          >
            Contact
          </Link>
        </nav>
        <div className="home-menu-actions">
          <Link prefetch={false} className="home-btn home-btn--quiet" href="/sign-in" onClick={close}>
            Sign in
          </Link>
          <Link prefetch={false} className="home-btn home-btn--primary" href={trialHref} onClick={close}>
            {trialLabel}
          </Link>
        </div>
      </div>
  );

  return (
    <>
      <button
        ref={burgerRef}
        type="button"
        className="home-burger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        {/* Three bars that fold into a cross (home.css, .home-burger-bar),
            rather than two drawings swapped, so the change can animate. */}
        <span className="home-burger-icon" aria-hidden="true">
          <span className="home-burger-bar" />
          <span className="home-burger-bar" />
          <span className="home-burger-bar" />
        </span>
      </button>
      {mounted && createPortal(panel, document.body)}
    </>
  );
}
