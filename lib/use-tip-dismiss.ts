"use client";

import { useEffect } from "react";

/** The attribute on html that hides every data-tip tooltip (app/mail.css). */
export const TIPS_HIDDEN_ATTR = "data-tips-hidden";

/**
 * WCAG 1.4.13: a tooltip that appears on hover or focus must be dismissable
 * without moving the pointer or the focus. Escape hides every tooltip; the
 * next pointer move or focus change brings them back, so the one under the
 * pointer only reappears once the person does something new.
 *
 * Document-wide and listened for once, because the tooltips are pure CSS and
 * any of them may be the one showing.
 */
export function useTipDismiss() {
  useEffect(() => {
    const root = document.documentElement;
    const hide = (e: KeyboardEvent) => {
      if (e.key === "Escape") root.setAttribute(TIPS_HIDDEN_ATTR, "");
    };
    const show = () => {
      if (root.hasAttribute(TIPS_HIDDEN_ATTR)) root.removeAttribute(TIPS_HIDDEN_ATTR);
    };
    document.addEventListener("keydown", hide);
    document.addEventListener("pointermove", show);
    document.addEventListener("focusin", show);
    return () => {
      document.removeEventListener("keydown", hide);
      document.removeEventListener("pointermove", show);
      document.removeEventListener("focusin", show);
      root.removeAttribute(TIPS_HIDDEN_ATTR);
    };
  }, []);
}
