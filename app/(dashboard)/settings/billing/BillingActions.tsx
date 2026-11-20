"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/pricing";
import { EditorActions, SettingRow, escapeCloses, useSave, type Done } from "../SettingRow";

/**
 * The interactive parts of Settings → Billing (20 Nov 2026 design): choosing
 * a plan, opening the Stripe portal, and asking us to close the workspace.
 * Everything else on the page is a fact the server renders.
 *
 * Stripe's URLs are another origin, so navigation is window.location.assign,
 * not the router. The checkout route refuses a second subscription and says
 * to use Manage instead (lib/stripe.ts checkoutRefusal).
 */

type PlanSummary = { id: string; name: string; price: number; tagline: string };

function go(url: string) {
  window.location.assign(url);
}

/** "Payments: Not set up yet" with Choose a plan, when Stripe is configured. */
export function ChoosePlanRow({ plans }: { plans: PlanSummary[] }) {
  return (
    <SettingRow
      label="Payments"
      read={<span className="stg-biz-value stg-biz-value--empty">Not set up yet</span>}
      note="Choose a plan to pay by card. Nothing is charged until you do."
      quietNote
      actionText="Choose a plan"
      actionLabel="Choose a plan to pay by card"
      editor={(done) => <PlanPicker plans={plans} done={done} />}
    />
  );
}

function PlanPicker({ plans, done }: { plans: PlanSummary[]; done: Done }) {
  const { save, saving, error } = useSave<{ url?: string }>("/api/billing/checkout", {
    method: "POST",
    refresh: false,
  });
  const [choice, setChoice] = useState(plans[0]?.id ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = await save({ plan: choice });
    if (result?.url) go(result.url);
  }

  return (
    <form className="stg-biz-editor" onSubmit={submit}>
      <fieldset className="stg-biz-choices">
        <legend className="stg-sr-only">Plan</legend>
        {plans.map((p, i) => (
          <div className="stg-biz-choice" key={p.id}>
            <input
              id={`plan-${p.id}`}
              type="radio"
              name="plan"
              value={p.id}
              checked={choice === p.id}
              autoFocus={i === 0}
              aria-describedby={`plan-${p.id}-hint`}
              onChange={() => setChoice(p.id)}
              onKeyDown={escapeCloses(done)}
            />
            <label className="stg-biz-choice-label" htmlFor={`plan-${p.id}`}>
              {p.name} — {formatPrice(p.price)} a month
            </label>
            <span className="stg-biz-choice-hint" id={`plan-${p.id}-hint`}>
              {p.tagline}
            </span>
          </div>
        ))}
      </fieldset>
      <EditorActions
        saving={saving}
        canSave={!!choice}
        saveText="Continue to payment"
        onCancel={() => done(false)}
        error={error}
      />
    </form>
  );
}

/** Opens the Stripe portal: card, invoices, plan changes, cancelling. */
export function ManageBillingButton() {
  const { save, saving, error } = useSave<{ url?: string }>("/api/billing/portal", {
    method: "POST",
    refresh: false,
  });
  return (
    <>
      <button
        type="button"
        className="stg-biz-action"
        aria-label="Manage billing in Stripe"
        disabled={saving}
        onClick={async () => {
          const result = await save({});
          if (result?.url) go(result.url);
        }}
      >
        {saving ? "Opening…" : "Manage"}
      </button>
      {error && (
        <span className="stg-biz-note" role="alert">
          {error}
        </span>
      )}
    </>
  );
}

/** "Close this workspace" — a request to us, never a delete. */
export function CloseWorkspaceRow({
  workspaceName,
  email,
}: {
  workspaceName: string;
  email: string;
}) {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="stg-biz-row">
        <dt className="stg-sr-only">Close this workspace</dt>
        <dd className="stg-biz-body">
          <span className="stg-biz-value">Request sent</span>
          <span className="stg-biz-note stg-biz-note--quiet" role="status">
            We’ll email {email} to confirm before anything is deleted.
          </span>
        </dd>
      </div>
    );
  }

  return (
    <SettingRow
      label="Close this workspace"
      read={<span className="stg-biz-value">Close this workspace</span>}
      note={
        <>
          Deletes your messages, newsletters and subscribers for good.{" "}
          <Link href="/settings/website" className="stg-biz-inline">
            Download your data
          </Link>{" "}
          first if you want to keep it.
        </>
      }
      quietNote
      actionText="Close workspace"
      actionLabel={`Close workspace ${workspaceName}`}
      danger
      hideLabel
      editor={(done) => (
        <CloseRequest workspaceName={workspaceName} done={done} onSent={() => setSent(true)} />
      )}
    />
  );
}

function CloseRequest({
  workspaceName,
  done,
  onSent,
}: {
  workspaceName: string;
  done: Done;
  onSent: () => void;
}) {
  const [reason, setReason] = useState("");
  const { save, saving, error } = useSave<{ ok?: boolean }>("/api/workspace/close-request", {
    method: "POST",
    refresh: false,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await save({ reason })) onSent();
  }

  return (
    <form className="stg-biz-editor" onSubmit={submit}>
      <p className="stg-biz-confirm">
        We’ll close <b>{workspaceName}</b> for you. Nothing is deleted until we’ve
        confirmed with you by email.
      </p>
      <label className="stg-field">
        <span className="stg-field-label">Anything we should know? (optional)</span>
        <textarea
          className="stg-input stg-textarea"
          rows={3}
          maxLength={1000}
          value={reason}
          autoFocus
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={escapeCloses(done)}
        />
      </label>
      <EditorActions
        saving={saving}
        saveText="Ask us to close it"
        onCancel={() => done(false)}
        error={error}
      />
    </form>
  );
}
