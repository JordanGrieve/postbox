import { escapeHtml } from "./newsletter";

/**
 * The pages a client's CUSTOMER sees after posting a contact form with no
 * JavaScript: the browser navigates to /api/tickets/:key and renders whatever
 * comes back. Standalone HTML, because there is no app shell on an API route.
 *
 * Held to the product's bar (WCAG 2.2 AAA, STYLE-GUIDE.md) like any other page
 * a stranger reads. They used to miss it in four ways: no `lang` on <html>
 * (3.1.1), body text at about 4.8:1 (#7a7264 on white, under the 7:1 of
 * 1.4.6), font sizes in px (1.4.4), and the pre-monochrome terracotta accent.
 *
 * Colours are literal because there are no tokens on a page with no app
 * stylesheet. FORM_PAGE_COLOURS names them so tests/form-response-pages.test.ts
 * can measure every text pair rather than trust this comment.
 */
export const FORM_PAGE_COLOURS = {
  page: "#f5f5f5",
  card: "#ffffff",
  border: "#e5e5e5",
  ink: "#111111",
  body: "#4d4d4d",
  mark: "#ededed",
} as const;

const C = FORM_PAGE_COLOURS;

const STYLE = `body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:${C.page};color:${C.ink};display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:${C.card};border:1px solid ${C.border};border-radius:16px;padding:40px;max-width:420px;margin:16px;text-align:center}
.mark{width:3.5rem;height:3.5rem;border-radius:50%;background:${C.mark};color:${C.ink};display:flex;align-items:center;justify-content:center;font-size:1.75rem;margin:0 auto 18px}
h1{font-size:1.25rem;line-height:1.3;margin:0 0 8px}p{color:${C.body};line-height:1.6;margin:0}`;

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>${STYLE}</style></head>
<body><main class="card">${body}</main></body></html>`;
}

/** "Thanks — we got your message", naming the business the customer wrote to. */
export function formSuccessPage(workspaceName: string): string {
  return page(
    "Message sent",
    `<div class="mark" aria-hidden="true">✓</div><h1>Thanks — we got your message</h1>
<p>${escapeHtml(workspaceName)} has received your enquiry and will reply by email soon.</p>`,
  );
}

/** "We couldn't send that", with the validation message the route produced. */
export function formErrorPage(error: string): string {
  return page(
    "Couldn't send",
    `<h1>We couldn't send that</h1><p>${escapeHtml(error)}</p>`,
  );
}
