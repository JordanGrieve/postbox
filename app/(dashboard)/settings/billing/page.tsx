import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveViewer } from "@/lib/viewer";
import { getWorkspaceEntitlement } from "@/lib/billing-query";
import { PLANS, TRIAL_DAYS, formatPrice, planById } from "@/lib/pricing";
import { describeBlock } from "@/lib/trial";
import { OPERATOR_BILLING_REFUSAL, stripeConfigured } from "@/lib/stripe";
import { InfoRow, RowGroup, RowLink, SettingsHeader } from "../rows";
import { ChoosePlanRow, CloseWorkspaceRow, ManageBillingButton } from "./BillingActions";

export const metadata = { title: "Billing · Settings" };

/**
 * Settings → Billing: what the workspace is on, how it pays, and how to
 * leave. Built to the 20 Nov 2026 design (read, then act).
 *
 * Every state is derived, never written: the plan from lib/trial.ts
 * entitlement, payments from whether Stripe is configured and whether this
 * workspace has a subscription. The design draws one case — a comped workspace
 * on a deployment with no card payments — and its words are kept for exactly
 * that case; the others say what is true for them.
 *
 * Cancelling stays one click away for a paying client (Manage opens the Stripe
 * portal): a subscription that can only be cancelled by emailing us is, for a
 * UK consumer, a regulatory problem rather than a design one.
 */
export default async function BillingSettingsPage() {
  const viewer = await resolveViewer();
  if (!viewer.workspace) redirect(viewer.isAdmin ? "/admin" : "/no-access");
  const w = viewer.workspace;

  const e = await getWorkspaceEntitlement(w.id);
  if (!e) redirect("/no-access");

  const plan = e.plan === "trial" ? null : planById(e.plan);
  const stripe = stripeConfigured();
  const paying = !e.comped && plan !== null;

  const getInTouch = (
    <Link prefetch={false} href="/contact" className="stg-biz-inline">
      get in touch
    </Link>
  );

  let planValue: string;
  let planNote: React.ReactNode;
  if (e.comped) {
    planValue = "Free";
    planNote = (
      <>Full access to everything, with nothing to pay. If that’s a surprise, {getInTouch} and we’ll explain.</>
    );
  } else if (plan) {
    planValue = `${plan.name} — ${formatPrice(plan.price)} a month`;
    planNote = plan.tagline;
  } else if (e.daysLeft !== null && e.daysLeft > 0) {
    planValue = "Free trial";
    planNote =
      e.daysLeft === 1
        ? "Last day of your free trial."
        : `${e.daysLeft} days left of your ${TRIAL_DAYS}-day free trial.`;
  } else {
    planValue = "Free trial — ended";
    planNote = null;
  }

  return (
    <div className="stg-wrap">
      <SettingsHeader title="Billing" sub="What you’re on, and how to pay." />

      <RowGroup title="Your plan">
        <InfoRow label="Plan" value={planValue} note={planNote} />
        {/*
          What is blocked, stated plainly — and describeBlock always goes on to
          say what still works, because somebody reading this is worried about
          their customer mail, and the true answer is that it is unaffected.
        */}
        {e.blockedReason && (
          <InfoRow
            label="Right now"
            value="Newsletter sending is paused"
            note={describeBlock(e.blockedReason)}
            warn
          />
        )}

        {viewer.isAdmin ? (
          // An operator inside the workspace: the billing routes refuse them
          // (operatorBillingRefusal), so offer no button that would fail.
          <InfoRow
            label="Payments"
            value={paying ? "Paid monthly by card" : e.comped ? "Nothing to pay" : "Not paying yet"}
            note={OPERATOR_BILLING_REFUSAL}
          />
        ) : !stripe ? (
          <InfoRow
            label="Payments"
            value="Not set up yet"
            empty
            note="We don’t take card payments just now. If you’d like to pay, we’ll sort it out with you directly."
            action={
              <RowLink href="/contact" label="Get in touch about paying">
                Get in touch
              </RowLink>
            }
          />
        ) : e.comped ? (
          <InfoRow label="Payments" value="Nothing to pay" />
        ) : paying ? (
          <InfoRow
            label="Payments"
            value="Paid monthly by card"
            note="Change plan, update your card, see invoices or cancel — in Stripe."
            action={<ManageBillingButton />}
          />
        ) : (
          <ChoosePlanRow
            plans={PLANS.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              tagline: p.tagline,
            }))}
          />
        )}
      </RowGroup>

      {/* The close request refuses operators too; they close from the console. */}
      {!viewer.isAdmin && (
        <RowGroup title="Leaving">
          <CloseWorkspaceRow workspaceName={w.name} email={viewer.email} />
        </RowGroup>
      )}
    </div>
  );
}
