"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

/**
 * A button that opens its children in the shared modal (components/Modal.tsx,
 * a bottom sheet on a phone). For content that is worth having but not worth
 * the space on the page: the access log's "what this log does and does not
 * say" since 17 Nov 2026 (Jordan: "put this message inside a modal, so put a
 * button there that opens this").
 *
 * The children are rendered on the server and handed in as a node, so a page
 * can stay a Server Component and only this button hydrates.
 */
export default function ModalButton({
  label,
  title,
  closeLabel,
  size = "md",
  buttonClassName = "stg-button stg-button--secondary",
  children,
}: {
  /** The button's text. */
  label: string;
  /** The modal's heading. */
  title: string;
  /** The cross's accessible name. */
  closeLabel: string;
  size?: "sm" | "md";
  buttonClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        closeLabel={closeLabel}
        size={size}
      >
        {children}
      </Modal>
    </>
  );
}
