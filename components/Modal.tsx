"use client";

import { useEffect, useId, useRef, useState } from "react";
import SheetGrip from "@/components/mail/SheetGrip";
import { useMediaQuery } from "@/lib/use-media-query";
import {
  decideSheetTouch,
  modalSwipeScrollsContent,
  sheetOffset,
  shouldCloseOnRelease,
  type SheetTouch,
} from "@/lib/sheet-drag";

/**
 * The width at and below which every modal is a bottom sheet. Mirrors the
 * media query on .pb-modal in app/globals.css: the CSS decides the layout,
 * this only decides whether the drag gesture is wired.
 */
export const SHEET_QUERY = "(max-width: 640px)";

/**
 * THE modal. One since 17 Nov 2026 — Jordan: "we want every modal, modals on
 * phone, all the same, buttons etc." Until then there were two, built twice:
 * the admin console's account details (a native <dialog> that became a
 * dragable bottom sheet on a phone) and the inbox's label manager (a div with
 * a home-made scrim, a role="dialog", its own Escape listener and no sheet).
 * This is the first of those, generalised; the second and the team invite now
 * use it.
 *
 * ── WHY A NATIVE <dialog> ──
 * showModal() gives focus containment, Escape, an inert page behind and focus
 * returned to the opener afterwards, with no library: the four things a
 * hand-rolled modal most often gets wrong (the label manager had no focus
 * trap at all).
 *
 * ── ONE CLOSE PATH ──
 * The cross, Escape, a click on the backdrop and a drag down on a phone all
 * end in dialog.close(), and the dialog's own "close" event calls onClose.
 * Nothing calls onClose directly, so the four cannot drift apart.
 *
 * ── ON A PHONE, A BOTTOM SHEET ──
 * At SHEET_QUERY it is full width, pinned to the bottom, rounded on top, slides
 * up on open and has the grab bar (SheetGrip). It drags down to close from the
 * bar, and from the body when the body is scrolled to its top and the finger
 * moves down; past 110px a release closes, and a system cancel never does. The
 * rules are lib/sheet-drag.ts, shared with the inbox's contact sheet. The body
 * listens with raw non-passive touch listeners because touch-action cannot
 * express a conditional claim.
 *
 * ── CHILDREN STAY MOUNTED ──
 * The <dialog> is always in the DOM so the ref exists before the first open,
 * and so do its children: a form inside can close the modal on submit without
 * unmounting itself mid-submission. A caller whose content depends on data
 * that only exists while open renders it conditionally itself.
 */
export default function Modal({
  open,
  onClose,
  title,
  closeLabel,
  size = "md",
  onEscape,
  closeOnLinkClick = false,
  className,
  children,
}: {
  open: boolean;
  /** Called once the dialog has closed, by any of the four routes. */
  onClose: () => void;
  /** The heading. The dialog is announced by it. */
  title: React.ReactNode;
  /** The cross's accessible name: "Close account details". */
  closeLabel: string;
  /** sm 440px, md 600px. Both full width as a sheet. */
  size?: "sm" | "md";
  /**
   * Escape, before it closes anything. Return true to say "handled, stay
   * open": the label manager backs out of a delete question first.
   */
  onEscape?: () => boolean;
  /**
   * Close when a link inside is followed. The account details' links open a
   * confirmation panel on the page behind, which the modal would cover.
   */
  closeOnLinkClick?: boolean;
  /** Extra class on the dialog, for content-specific rules. */
  className?: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [dragY, setDragY] = useState(0);
  const sheet = useMediaQuery(SHEET_QUERY);
  const close = () => dialogRef.current?.close();

  /*
    Drive the native dialog from the prop. showModal() can only be called on
    a connected, closed dialog, hence the checks.
  */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el || !open || !sheet) return;
    let startX = 0;
    let startY = 0;
    let mode: SheetTouch = "wait";
    let travelled = 0;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || !t) {
        mode = "scroll";
        return;
      }
      startX = t.clientX;
      startY = t.clientY;
      mode = "wait";
      travelled = 0;
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || mode === "scroll") return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (mode === "wait") mode = decideSheetTouch(el.scrollTop, dx, dy);
      if (mode !== "drag") return;
      if (e.cancelable) e.preventDefault();
      travelled = sheetOffset(dy);
      setDragY(travelled);
    };
    const onEnd = () => {
      const wasDrag = mode === "drag";
      const distance = travelled;
      mode = "wait";
      travelled = 0;
      if (!wasDrag) return;
      setDragY(0);
      if (shouldCloseOnRelease(distance)) dialogRef.current?.close();
    };
    // Taken away by the system: never a close, however far it had moved.
    const onCancel = () => {
      if (mode === "drag") setDragY(0);
      mode = "wait";
      travelled = 0;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onCancel);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [open, sheet]);

  /*
    Hold the page still while the modal is open. html { overflow: hidden }
    (globals.css) is not enough on a phone: a swipe on the backdrop, or past
    the end of the modal's own scroll, is handed on to the page underneath
    (Jordan, 22 Nov 2026: "i can scroll behind it"). A swipe is let through
    only when it will scroll something inside the modal — the body, or a
    textarea in it — and cancelled otherwise. lib/sheet-drag.ts holds the rule.
  */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    let startY = 0;
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!e.cancelable || e.touches.length !== 1) return;
      const scroller = scrollerFor(e.target, dialog);
      const lets = modalSwipeScrollsContent({
        inside: scroller !== null,
        scrollTop: scroller?.scrollTop ?? 0,
        scrollHeight: scroller?.scrollHeight ?? 0,
        clientHeight: scroller?.clientHeight ?? 0,
        dy: (e.touches[0]?.clientY ?? startY) - startY,
      });
      if (!lets) e.preventDefault();
    };
    dialog.addEventListener("touchstart", onStart, { passive: true });
    dialog.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      dialog.removeEventListener("touchstart", onStart);
      dialog.removeEventListener("touchmove", onMove);
    };
  }, [open]);

  return (
    /*
      The lint rules below ask for a keyboard twin of a click handler on a
      non-interactive element. This one has two built in: Escape closes a
      modal <dialog> natively, and the cross is the first control inside. The
      click handler only adds the mouse-only backdrop gesture, which works
      because the dialog has no padding: a click on it, rather than on its
      content, can only be a click on the backdrop.
    */
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className={className ? `pb-modal ${className}` : "pb-modal"}
      data-size={size}
      aria-labelledby={titleId}
      data-dragging={dragY !== 0 || undefined}
      style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
      onCancel={(e) => {
        // Escape. The dialog would close itself; a caller may hold it open.
        if (onEscape?.()) e.preventDefault();
      }}
      onClose={() => {
        setDragY(0);
        onClose();
      }}
      onClick={(e) => {
        const target = e.target as Element;
        if (
          target === e.currentTarget ||
          (closeOnLinkClick && target.closest("a"))
        ) {
          e.currentTarget.close();
        }
      }}
    >
      {/* Hidden by CSS above the sheet width, so on a desktop it is neither
          drawn nor focusable. */}
      {open && (
        <SheetGrip
          onClose={close}
          onOffset={setDragY}
          label={`Drag down to ${closeLabel.charAt(0).toLowerCase()}${closeLabel.slice(1)}`}
          className="pb-sheet-grip"
        />
      )}
      <div className="pb-modal-inner" ref={innerRef}>
        {/* The heading and cross only while open: a closed modal announces
            nothing and holds no focusable control. */}
        {open && (
          <div className="pb-modal-head">
            <h2 id={titleId} className="pb-modal-title">
              {title}
            </h2>
            <button
              type="button"
              className="pb-modal-close"
              onClick={close}
              aria-label={closeLabel}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}

/**
 * The element a swipe would scroll: the nearest one between the touch and the
 * dialog that has content to scroll and is allowed to (overflow auto/scroll,
 * or a textarea). Null when there is none, e.g. a touch on the backdrop.
 */
function scrollerFor(target: EventTarget | null, dialog: HTMLElement): HTMLElement | null {
  for (let el = target instanceof Element ? target : null; el && el !== dialog; el = el.parentElement) {
    if (!(el instanceof HTMLElement) || el.scrollHeight <= el.clientHeight) continue;
    const overflowY = getComputedStyle(el).overflowY;
    if (el instanceof HTMLTextAreaElement || overflowY === "auto" || overflowY === "scroll") return el;
  }
  return null;
}
