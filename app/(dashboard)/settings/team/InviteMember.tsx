"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

/**
 * "Add new member" at the top right of Team, opening the invite form in the
 * shared modal (a bottom sheet on a phone). Jordan, 17 Nov 2026: "this add
 * should be a modal so put a add new member top right and then it opens a
 * small modal and it comes from below on mobile".
 *
 * The form and the server action are the ones the page had inline, unchanged:
 * the action validates, invites and redirects back with ?notice= or ?error=,
 * which the page shows as before. The modal closes on submit; its content
 * stays mounted (Modal keeps children), so closing it does not unmount the
 * form mid-submission.
 */
export default function InviteMember({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="stg-button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Add new member
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add new member"
        closeLabel="Close add new member"
        size="sm"
      >
        <form action={action} onSubmit={() => setOpen(false)}>
          <label className="stg-field">
            <span className="stg-field-label">Their email address</span>
            <input
              className="stg-input"
              type="email"
              name="email"
              required
              maxLength={254}
              autoComplete="off"
              placeholder="name@yourbusiness.com"
            />
          </label>
          <button className="stg-button stg-button--wide" type="submit">
            Send invite
          </button>
        </form>
      </Modal>
    </>
  );
}
