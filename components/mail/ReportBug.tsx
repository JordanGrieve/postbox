"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Modal from "@/components/Modal";

/**
 * "Report a bug", above Sign out in the account menu (Jordan, 22 Nov 2026).
 *
 * Two parts, because the account menu unmounts when it closes: the menu row
 * (ReportBugItem) lives inside it, and the modal (ReportBugModal) lives beside
 * the menu in MailNavShell, so opening the modal can close the menu without
 * taking the modal with it.
 *
 * The page the person was on is sent with the report — the path only; the
 * server drops any query string again (lib/bug-reports.ts reportedPage). The
 * report lands in the operator console's Bug reports pane.
 */

export function ReportBugItem({ onSelect }: { onSelect: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="pbm-menu-item"
      aria-haspopup="dialog"
      onClick={onSelect}
    >
      Report a bug
    </button>
  );
}

export default function ReportBugModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function close() {
    onClose();
    // A sent report is finished: reopening starts a fresh one. An unsent one
    // keeps its words, so closing by accident loses nothing.
    if (sent) {
      setSent(false);
      setMessage("");
    }
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, page: pathname }),
      });
      const data: { ok?: boolean; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? "That didn’t send. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("That didn’t send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Report a bug" closeLabel="Close report a bug" size="sm">
      {sent ? (
        <div className="pbm-bug">
          <p className="pbm-bug-done" role="status">
            Thanks, that’s been sent. We’ll look into it.
          </p>
          <button type="button" className="stg-button stg-button--wide" onClick={close}>
            Done
          </button>
        </div>
      ) : (
        <form className="pbm-bug" onSubmit={submit}>
          <label className="pbm-bug-label" htmlFor="pbm-bug-message">
            What went wrong?
          </label>
          <textarea
            id="pbm-bug-message"
            className="pbn-input pbm-bug-input"
            rows={5}
            maxLength={2000}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {error && (
            <p className="pbm-bug-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="stg-button stg-button--wide"
            disabled={sending || !message.trim()}
          >
            {sending ? "Sending…" : "Send report"}
          </button>
        </form>
      )}
    </Modal>
  );
}
