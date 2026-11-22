import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SchedulePanel from "../app/(dashboard)/newsletters/SchedulePanel";
import RecipientsPanel from "../app/(dashboard)/newsletters/RecipientsPanel";
import type { RecipientStatus } from "../db/schema";

/**
 * A campaign that has gone says so, and offers nothing that would act on it.
 *
 * 22 Nov 2026 mobile journey test: after "1 sent just now. That was
 * everybody", the panel still read "Scheduled · 13:39 · Cancel" (the route
 * returned the pre-send row — fixed there), and a `sent` campaign fell
 * through to the arming form: the readiness checklist, "When to send", and a
 * greyed-out "Send now" for a campaign that had already been sent.
 */

const recipients = {
  queued: 0,
  sent: 0,
  delivered: 1,
  bounced: 0,
  complained: 0,
  failed: 0,
} satisfies Record<RecipientStatus, number>;

function panel(status: "sent" | "draft") {
  return renderToStaticMarkup(
    <SchedulePanel
      savedId={22}
      status={status}
      dirty={false}
      recipientCount={1}
      scheduledAtIso="2026-11-22T13:39:00.000Z"
      recipientsPerSweep={75}
      health={null}
      recipients={recipients}
      abort={{ kind: "idle" }}
      onAbort={() => {}}
      requeue={{ kind: "idle" }}
      onRequeue={() => {}}
      schedule={{ kind: "idle" }}
      onScheduleReset={() => {}}
      onArm={() => {}}
      onCancelSchedule={() => {}}
      steps={[]}
      ready
      onFix={() => {}}
      canSendLegally
      viewerEmail="owner@example.com"
    />,
  );
}

describe("a sent campaign's schedule panel", () => {
  it("says it was sent, to how many", () => {
    const html = panel("sent");
    expect(html).toContain("Sent");
    expect(html).toMatch(/1 person/);
  });

  it("offers no Cancel, no Send now, and no 'queued' drain note", () => {
    const html = panel("sent");
    expect(html).not.toContain(">Cancel<");
    expect(html).not.toContain("Send now");
    expect(html).not.toContain("When to send");
    expect(html).not.toContain("queued — one pass");
  });

  it("leaves a draft's send controls alone", () => {
    const html = panel("draft");
    expect(html).toContain("Send now");
    expect(html).toContain("queued — one pass");
    expect(html).toContain("Schedule this campaign");
  });

  it("is not titled 'Schedule this campaign' once it has gone", () => {
    // Desktop journey test, 22 Nov 2026.
    expect(panel("sent")).not.toContain("Schedule this campaign");
  });
});

describe("the Recipients card after a send", () => {
  function recipients(status: "sent" | "draft") {
    return renderToStaticMarkup(
      <RecipientsPanel
        savedId={22}
        status={status}
        dirty={false}
        recipientCount={1}
        queue={{ kind: "done", inserted: 1, total: 1 }}
        chasing={false}
        onQueue={() => {}}
        onDiscard={() => {}}
      />,
    );
  }

  it("drops the queueing note, which is no longer true", () => {
    // Desktop journey test, 22 Nov 2026: under "Sent to 1 person" it still
    // said the rows were "all sitting at 'queued'" and that queueing sends
    // nothing by itself.
    expect(recipients("sent")).not.toContain("sitting at");
  });

  it("keeps it while the campaign is still a draft", () => {
    expect(recipients("draft")).toContain("sitting at");
  });
});
