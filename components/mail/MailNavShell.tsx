"use client";

import { useEffect, useRef, useState } from "react";
import { useDismiss } from "@/lib/use-dismiss";
import { useMediaQuery } from "@/lib/use-media-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
// Not Clerk's <SignOutButton>: an operator signing out from inside a client
// workspace has an open audit row to close first. See the component's header.
import AuditedSignOutButton from "@/components/AuditedSignOutButton";
import ReportBugModal, { ReportBugItem } from "./ReportBug";
// Not "@/lib/tickets": that reaches lib/config, which is server-only. See the
// header of lib/ticket-format.ts.
import { initials } from "@/lib/ticket-format";
import { Icon, BrandMark, OverflowIcon } from "./icons";
import type { MailCountsDTO } from "./types";
import { SETTINGS_SECTIONS, settingsSectionFor } from "@/lib/settings-sections";

/**
 * The 262px navigation column, and — below 768px — the off-canvas drawer.
 *
 * The interactive half. MailNav.tsx is the server component that feeds it the
 * counts and the plan card; the dashboard layout that renders it is owned
 * elsewhere and cannot be asked for them.
 *
 * The drawer reuses the pb-* classes already in globals.css (pb-sidebar,
 * pb-scrim, pb-topbar). Those solve scroll-locking behind an
 * open drawer via `.pb-shell:has(.pb-scrim) .pb-scroll`, and were measured on a
 * real phone — mail.css only widens the desktop column and repaints them, it
 * does not reimplement the mechanics.
 */

export default function MailNavShell({
  workspaceName,
  userLabel,
  counts,
  billing,
  isAdmin = false,
}: {
  workspaceName: string;
  userLabel: string;
  counts: MailCountsDTO;
  /**
   * The plan card, already worded by lib/trial.ts. Null when entitlement could
   * not be read, in which case no card is drawn — see MailNav.
   */
  billing: {
    title: string;
    body: string;
    cta: string;
    urgent: boolean;
  } | null;
  isAdmin?: boolean;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Outside the menu, which unmounts when it closes (components/mail/ReportBug.tsx).
  const [bugOpen, setBugOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const settingsSection = settingsSectionFor(pathname);

  /*
   * ── THE DRAWER IS A DRAWER ONLY ON A PHONE ──
   * Above 768px this same <nav> is the always-visible column, so nothing here
   * may hide it or trap focus there. `phone` mirrors the globals.css
   * breakpoint. A drawer left open while the viewport grows to desktop is shut
   * during render, so the background can never stay inert behind a column.
   *
   * CSS carries the closed state on its own: `visibility: hidden` on the
   * closed drawer (delayed until the slide-out has finished) takes it out of
   * the tab order and the accessibility tree before any of this has hydrated.
   * `inert` below is the same guarantee from the script side.
   */
  const phone = useMediaQuery("(max-width: 768px)");
  if (navOpen && !phone) setNavOpen(false);
  const drawerOpen = navOpen && phone;

  const navRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  /** Escape and the scrim hand focus back to the burger; following a link does not. */
  const returnFocusRef = useRef(false);

  function closeNav(returnFocus: boolean) {
    returnFocusRef.current = returnFocus;
    setNavOpen(false);
  }

  useDismiss(drawerOpen, () => closeNav(true));

  // While the drawer is open everything else is inert, and focus starts
  // inside it. On close the background comes back BEFORE focus returns to
  // the burger, which would otherwise still be inert and refuse it.
  useEffect(() => {
    if (!drawerOpen) return;
    const nav = navRef.current;
    const burger = burgerRef.current;
    const restore = nav ? inertOutside(nav) : () => {};
    if (nav) firstFocusable(nav)?.focus();
    return () => {
      restore();
      if (returnFocusRef.current) burger?.focus();
      returnFocusRef.current = false;
    };
  }, [drawerOpen]);

  // Standard menu semantics: Esc and clicking anywhere else close it.
  useDismiss(menuOpen, () => setMenuOpen(false), menuRef);

  // The inbox is the list and every thread opened from it.
  const inInbox = pathname === "/inbox" || pathname.startsWith("/tickets/");
  // The Newsletter page, the composer, and one person's page from its People
  // tab (/subscribers/[id] kept its address).
  const newsletterActive =
    pathname.startsWith("/newsletters") || pathname.startsWith("/subscribers");



  return (
    <>
      {/* Mobile top bar. Hidden above 768px by globals.css. Deliberately not
          rendered on a thread route: the thread has its own header with a back
          button, and 56px of extra chrome is a lot of a 390px screen. */}
      {!pathname.startsWith("/tickets/") && (
        <header className="pb-topbar pbm-topbar">
          {/*
            Three divs used to draw this: 15px wide, 1.8px tall, stacked with
            a gap. At that size a CSS box lands on fractional device pixels and
            the bars render at inconsistent weights — which is what made it
            look wrong next to icons that are all stroked SVG.
          */}
          <button
            ref={burgerRef}
            className="pbm-burger"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" size={18} strokeWidth={2} />
          </button>
          <div className="pbm-topbar-text">
            <div className="pbm-topbar-name">{workspaceName}</div>
            <div className="pbm-topbar-sub">
              {isAdmin ? "viewing as admin" : "postbox"}
            </div>
          </div>
        </header>
      )}

      {drawerOpen && (
        <div className="pb-scrim" onClick={() => closeNav(true)} aria-hidden />
      )}

      {/* The rules report on the ELEMENT, not on the onClick line, so the
          directive below has to sit here rather than beside the handler — and
          it has to be a comment of its own, because ESLint only reads a
          directive when it is the first text in the comment. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <nav
        ref={navRef}
        className="pb-sidebar pbm-nav"
        data-open={drawerOpen}
        // Closed on a phone: out of the tab order and the accessibility tree.
        // Never on desktop, where this is the visible column.
        inert={phone && !drawerOpen}
        aria-label="Mail folders"
        // Tapping any link in the drawer navigates, so the drawer must close.
        //
        // ── WHY THE RULE IS DISABLED HERE AND NOT SATISFIED ──
        // This is delegation, not a click target: the handler does nothing
        // unless the click came from inside an <a>. Those anchors are already
        // keyboard-operable, and activating one with Enter fires a click that
        // bubbles to exactly this handler, so a keyboard user gets identical
        // behaviour. The rule cannot see through delegation.
        //
        // Satisfying it would be worse than disabling it. An onKeyDown on the
        // <nav> fires for every keystroke inside the drawer, including typing
        // in any future field, and a tabIndex would put a stop on the tab
        // order in front of the links people actually want.
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) closeNav(false);
        }}
      >
        {/*
          NO CLOSE BUTTON. Tapping anywhere outside the drawer closes it, and
          so does Escape, and so does following any link inside it — three ways
          out already.

          It also looked wrong, which is what surfaced it: the button is
          inline-flex inside a flex column, so it stretched to the full width
          of the drawer and rendered as a long empty bar with a small cross at
          its left end. It read as a broken input rather than as a control.
        */}
        <div className="pbm-brand">
          <span className="pbm-brand-mark">
            <BrandMark size={20} />
          </span>
          <span className="pbm-brand-name">{workspaceName}</span>
        </div>

        {isAdmin && (
          <Link prefetch={false} href="/admin" className="pbm-admin-link">
            All clients
          </Link>
        )}

        {/*
          ── THREE ROWS ──
          Jordan, 18 Nov 2026, from a mockup: the dashboard was "too
          complicated". Eleven folders, a More/Less group and a Labels block
          became Inbox (To reply and Done are tabs on the list), Newsletter
          and Settings. Subscribers was a fourth row until 19 Nov 2026; it is
          the Newsletter page's People tab now.
        */}
        <div className="pbm-folders">
          <Link prefetch={false}
            href="/inbox"
            className="pbm-folder"
            data-active={inInbox}
            aria-current={inInbox ? "page" : undefined}
          >
            <Icon name="mail" size={18} />
            <span className="pbm-folder-label">Inbox</span>
            {/* What is waiting on a reply, the number the list's "To reply"
                tab shows. */}
            <span className="pbm-folder-count">{counts.inbox}</span>
          </Link>
          <Link prefetch={false}
            href="/newsletters"
            className="pbm-folder"
            data-active={newsletterActive}
            aria-current={newsletterActive ? "page" : undefined}
          >
            <Icon name="news" size={18} />
            <span className="pbm-folder-label">Newsletter</span>
          </Link>
          {/* No Subscribers row since 19 Nov 2026: the people who signed up
              are the People tab on the Newsletter page, as in the mockup. */}
          {/*
            Settings is a row again (it was only in the account menu from
            26 Sep 2026, when the column was long). The mockup has it here,
            and the account menu no longer repeats it.

            Inside Settings its sections hang under it — the 20 Nov 2026
            settings designs ("Settings idea 3"), on Jordan's call — so a
            section is chosen here rather than from a strip of tabs at the top
            of every settings page. They appear only while you are IN Settings;
            everywhere else this is one row. The row then reads as open rather
            than selected: the selected thing is the section under it.

            Sections come from lib/settings-sections.ts, the same list the
            in-page tabs read, so the two cannot disagree.
          */}
          <Link prefetch={false}
            href="/settings"
            className="pbm-folder"
            data-open={settingsSection ? "true" : undefined}
          >
            <Icon name="settings" size={18} />
            <span className="pbm-folder-label">Settings</span>
          </Link>
          {settingsSection && (
            <ul className="pbm-subnav" aria-label="Settings sections">
              {SETTINGS_SECTIONS.map((s) => {
                const active = s.key === settingsSection.key;
                return (
                  <li key={s.key}>
                    <Link prefetch={false}
                      href={s.href}
                      className="pbm-subnav-item"
                      data-active={active}
                      aria-current={active ? "page" : undefined}
                    >
                      {s.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="pbm-nav-spacer" />

        {/* Account + sign out. The design has no such block, but sign-out has
            to stay reachable from the shell. */}
        <div className="pbm-account" ref={menuRef}>
          <button
            className="pbm-account-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Account menu for ${userLabel}`}
          >
            <span className="pbm-avatar" aria-hidden>
              {initials(userLabel)}
            </span>
            <span className="pbm-account-text">
              <span className="pbm-account-name">{userLabel}</span>
              <span className="pbm-account-role">
                {isAdmin ? "Admin" : "Owner"}
              </span>
            </span>
            <OverflowIcon size={15} />
          </button>
          {menuOpen && (
            <div className="pbm-menu" role="menu">
              <ReportBugItem
                onSelect={() => {
                  setMenuOpen(false);
                  setBugOpen(true);
                }}
              />
              <AuditedSignOutButton
                role="menuitem"
                className="pbm-menu-item pbm-menu-item--danger"
              >
                Sign out
              </AuditedSignOutButton>
            </div>
          )}
          <ReportBugModal open={bugOpen} onClose={() => setBugOpen(false)} />
        </div>

        {/*
          Every word of this comes from lib/trial.ts planCard(), which reads
          the workspace's actual entitlement. Nothing about plans is written
          here, because the version that was hard-coded went stale — it spent
          weeks telling people billing did not exist while /settings/billing,
          checkout and the Stripe webhook all worked.

          Omitted entirely when entitlement could not be read. A billing card
          that has to guess is worse than no billing card.
        */}
        {billing && (
          <aside className="pbm-pro" data-urgent={billing.urgent || undefined}>
            <p className="pbm-pro-title">{billing.title}</p>
            <p className="pbm-pro-body">{billing.body}</p>
            {/* A link, not a button. The old one was a disabled <button> with
                nowhere to go; this is the same destination the trial banner
                sends people to, so the two cannot disagree. */}
            <Link prefetch={false} className="pbm-pro-btn" href="/settings/billing">
              {billing.cta}
            </Link>
          </aside>
        )}
      </nav>

    </>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The first control in `root` a keyboard can reach — skipping inert groups. */
function firstFocusable(root: HTMLElement): HTMLElement | null {
  for (const el of root.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (!el.closest("[inert]")) return el;
  }
  return null;
}

/**
 * Make everything on the page except `keep` (and its ancestors) inert, the
 * way a modal does: at each level from `keep` up to <body>, every sibling.
 * Returns the undo. Only elements this call made inert are released, so an
 * element that was inert for its own reasons stays that way.
 */
function inertOutside(keep: HTMLElement): () => void {
  const touched: Element[] = [];
  for (let el: HTMLElement = keep; el.parentElement && el !== document.body; el = el.parentElement) {
    for (const sib of el.parentElement.children) {
      if (sib === el || sib.hasAttribute("inert")) continue;
      // The scrim is the way out; it must stay clickable.
      if (sib.classList.contains("pb-scrim")) continue;
      sib.setAttribute("inert", "");
      touched.push(sib);
    }
  }
  return () => {
    for (const el of touched) el.removeAttribute("inert");
  };
}
