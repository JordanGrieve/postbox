import { APP_URL, OPERATOR_LOCATION, OPERATOR_NAME, PUBLIC_CONTACT_EMAIL } from "@/lib/config";
import { PLANS, TRIAL_DAYS, TRIAL_LIMITS } from "@/lib/pricing";
import { GUIDES } from "@/lib/guides";

/**
 * /llms.txt: what Postbox is, in plain text, for AI assistants and the
 * crawlers behind them (the llmstxt.org convention). Added 23 Nov 2026, when
 * an SEO/GEO check found it a 404.
 *
 * It says what Postbox DOES before anything else, and that it is not the
 * desktop email client of the same name: to every search engine and model,
 * "Postbox" alone is that app. Prices are read from lib/pricing.ts, so this
 * cannot quote a plan that has changed.
 *
 * Public in proxy.ts: ".txt" is not on the matcher's asset list, so without
 * its line there Clerk would send a crawler to the sign-in page.
 */
export const dynamic = "force-static";

function body(): string {
  const plans = PLANS.map((p) => {
    const lines = p.features.map((f) => `  - ${f}`).join("\n");
    return `- ${p.name}: £${p.price} a month. ${p.tagline}\n${lines}`;
  }).join("\n");

  return `# Postbox

> Postbox is a shared support inbox and newsletter service for small businesses in the UK. A business's website contact form and support email arrive in one inbox their team answers from, and they can send newsletters to people who signed up, from the same place. It is not the Postbox desktop email client (postbox-inc.com), which is a different product from a different company.

Postbox is run by ${OPERATOR_NAME} in ${OPERATOR_LOCATION}. Every account has a ${TRIAL_DAYS}-day free trial (or ${TRIAL_LIMITS.tickets} conversations, whichever comes first), with no card needed.

## What it does

- Every message from a website's contact form, and every email to the business's support address, becomes a conversation in one shared inbox.
- Replies are sent as email from the inbox and stay in the same thread for the customer.
- Out-of-hours auto-replies, and each customer's history beside the conversation.
- Newsletters to subscribers who opted in, with their consent recorded.
- Customers' enquiries keep arriving whatever the account's billing state.

## Plans

${plans}

## Pages

- [Home](${APP_URL}/): what Postbox does, with pictures of the inbox
- [Pricing](${APP_URL}/pricing): the three plans and the pricing FAQ
- [Contact](${APP_URL}/contact): talk to the person who runs Postbox
- [Privacy](${APP_URL}/privacy): how personal data is handled
- [Terms](${APP_URL}/terms): the terms of service

## Guides

${GUIDES.map((g) => `- [${g.title}](${APP_URL}${g.path}): ${g.description}`).join("\n")}

## Contact

${PUBLIC_CONTACT_EMAIL}
`;
}

export function GET(): Response {
  return new Response(body(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
