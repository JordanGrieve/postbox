import { CORS_HEADERS, json, isValidEmail, clientIp } from "@/lib/http";
import { rateLimitDurable } from "@/lib/rate-limit-store";
import { isContactHoneypotTripped } from "@/lib/subscribe";
import { readContactSubmission } from "@/lib/submission-fields";
import { recordIngestionFailure, recordInvalidKey } from "@/lib/ingestion-log";
import { previewText } from "@/lib/tickets";
import { upsertContact, createTicket } from "@/lib/data";
import { resolveIngestKey } from "@/lib/forms";
import { notifyWorkspace } from "@/lib/notify";
import { maybeSendAutoReply } from "@/lib/auto-reply-send";
import { formErrorPage, formReturnUrl, formSuccessPage } from "@/lib/form-response-pages";
import { readFields, wantsHtml } from "@/lib/request-fields";

/**
 * POST /api/tickets/:apiKey — PUBLIC contact-form ingestion. The dashboard
 * reads tickets through server components, so there is no JSON read API.
 */

// ── CORS preflight ───────────────────────────────────────────────
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ── PUBLIC: contact-form ingestion ───────────────────────────────
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/tickets/[id]">,
) {
  const { id: apiKey } = await ctx.params;

  /*
    * The key is either the workspace-wide one or a named form's own key.
    * resolveIngestKey tries the workspace key first, because that is what
    * every installation in existence posts with today; a form key costs one
    * extra query and only for the workspaces that have adopted them.
    */
   const target = await resolveIngestKey(apiKey);
   const workspace = target?.workspace;
   if (!target || !workspace) {
    // THE bakery case. Their site posted a key that no longer existed, every
    // day for six weeks, and this branch discarded the fact every time — so
    // the only way it could ever have been found was the client complaining.
    await recordInvalidKey(apiKey, clientIp(req));
    return json(
      { ok: false, error: "Invalid API key." },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  // Two buckets. The workspace one stops a flood against one client from
  // consuming shared capacity; the IP one bounds a single sender, because each
  // accepted POST here writes a row AND sends up to two emails (the workspace
  // notification and the customer auto-reply). Without it, a stranger who
  // view-sources the client's page — where this key is published by design —
  // has an unmetered write-and-mail primitive.
  //
  // Both are counted in Postgres (lib/rate-limit-store.ts), so they hold
  // across serverless instances — the in-memory Map they used to use was
  // per-instance, which meant concurrency defeated every public limit here.
  // It degrades back to that Map if the database is unreachable, rather than
  // returning 429 to a client's real customers for the length of an outage.
  const ip = clientIp(req);
  const buckets: Array<[string, { max: number; windowMs: number } | undefined]> = [
    [`ingest:${workspace.id}`, undefined],
  ];
  if (ip) buckets.push([`ingest:ip:${ip}`, { max: 10, windowMs: 60_000 }]);

  for (const [bucket, opts] of buckets) {
    const limit = opts
      ? await rateLimitDurable(bucket, opts)
      : await rateLimitDurable(bucket);
    if (!limit.ok) {
      /*
        Recorded, because this is the one rejection that may be turning away a
        REAL customer.

        Every other reason in this log means the caller sent something wrong.
        This one means they might have sent something perfectly good and we
        refused it — a client whose form is being hammered, or retried by a
        broken script, has enquiries bouncing off a 429 while the sender reads
        "try again shortly". Unlogged, that is invisible from both ends, which
        is the bakery failure with a different cause.

        The workspace is known here (the key resolved above), so the console can
        say WHOSE form is being throttled rather than only that something was.
      */
      await recordIngestionFailure({
        reason: "rate_limited",
        key: apiKey,
        workspaceId: workspace.id,
      });
      return json(
        { ok: false, error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Retry-After": String(limit.retryAfterSeconds),
          },
        },
      );
    }
  }

  // Accept JSON (Mode B fetch) or form-encoded (Mode A native form).
  // Public, attacker-reachable input — cap every field's length.
  const fields = await readFields(req);

  /*
    Honeypot, on NAMESPACED field names — not the signup's.

    It used to share the signup's list, "website" and "company", on a form we
    did not write. Those are ordinary fields on a real contact form, so a
    customer who typed their company name was treated as a bot: discarded
    before validation, before the database, before the mailer, and thanked for
    getting in touch. See CONTACT_HONEYPOT_FIELDS in lib/subscribe.ts.

    Answered as if it had worked: a bot told it failed retries with the field
    cleared, one told it succeeded goes away.
  */
  if (isContactHoneypotTripped(fields)) {
    await recordIngestionFailure({
      reason: "honeypot",
      key: apiKey,
      workspaceId: workspace.id,
    });
    return honeypotSuccess(req, workspace.name);
  }
  /*
    Read by MEANING, not by exact spelling.

    `fields.name` and friends only ever matched a form somebody wrote to our
    documentation. Shopify posts contact[name], Contact Form 7 posts your-name,
    Elementor posts form_fields[name] — so "point your form at this URL", the
    mode a non-technical client picks, posted three empty strings from the two
    platforms most of them are on. See lib/submission-fields.ts.
  */
  const raw = readContactSubmission(fields);
  const name = raw.name.trim().slice(0, 120);
  const email = raw.email.trim();
  const message = raw.message.trim().slice(0, 10_000);
  const subject = raw.subject.trim().slice(0, 200);

  const missing: string[] = [];
  if (!name) missing.push("name");
  if (!email) missing.push("email");
  if (!message) missing.push("message");
  if (missing.length > 0) {
    // A form that suddenly starts posting incomplete bodies — a renamed input,
    // a broken build on the client's site — is broken in a way that otherwise
    // looks exactly like a quiet week.
    await recordIngestionFailure({
      reason: "missing_fields",
      key: apiKey,
      workspaceId: workspace.id,
    });
    return badRequest(req, `Missing required field(s): ${missing.join(", ")}.`);
  }
  if (email.length > 254 || !isValidEmail(email)) {
    return badRequest(req, "Please provide a valid email address.");
  }

  await upsertContact(workspace.id, name, email);

  const ticket = await createTicket({
    workspaceId: workspace.id,
    // Null when the workspace-wide key was used, which is every form installed
    // before named forms existed. The ticket is no less valid for it.
    formId: target.form?.id ?? null,
    source: "contact_form",
    customerName: name,
    customerEmail: email,
    subject: subject || previewText(message, 60),
    body: message,
  });

  await notifyWorkspace({ workspace, ticket, kind: "new", body: message });
  // Acknowledge the customer. Best-effort and self-guarding — see
  // lib/auto-reply.ts; a suppressed or failed auto-reply never fails the
  // submission.
  await maybeSendAutoReply({ workspace, ticket });

  // A native form submit (Mode A) navigates the browser here — show a tidy
  // confirmation page instead of raw JSON. Fetch/JSON callers get JSON.
  if (wantsHtml(req)) {
    return htmlSuccess(req, workspace.name);
  }

  return json(
    { ok: true, ticket: { id: ticket.id, status: ticket.status } },
    { status: 201, headers: CORS_HEADERS },
  );
}

// ── helpers ──────────────────────────────────────────────────────

// isJsonRequest, wantsHtml and readFields: lib/request-fields.ts, shared with
// the newsletter sign-up endpoint.

/**
 * The reply to a tripped honeypot: byte-identical in shape to a real success,
 * and a lie. Nothing was written and nobody was emailed.
 *
 * The ticket id is the giveaway to guard against — a real success returns one,
 * so this returns one too. `0` is used rather than a plausible number because
 * no ticket has id 0, so anything that later trusts this value fails loudly
 * instead of pointing at somebody else's ticket.
 */
function honeypotSuccess(req: Request, workspaceName: string): Response {
  if (wantsHtml(req)) {
    return htmlSuccess(req, workspaceName);
  }
  return json(
    { ok: true, ticket: { id: 0, status: "open" } },
    { status: 201, headers: CORS_HEADERS },
  );
}

function badRequest(req: Request, error: string): Response {
  if (wantsHtml(req)) {
    return new Response(formErrorPage(error, formReturnUrl(req.headers.get("referer"))), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS },
    });
  }
  return json({ ok: false, error }, { status: 400, headers: CORS_HEADERS });
}

function htmlSuccess(req: Request, workspaceName: string): Response {
  return new Response(formSuccessPage(workspaceName, formReturnUrl(req.headers.get("referer"))), {
    status: 201,
    headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS },
  });
}
