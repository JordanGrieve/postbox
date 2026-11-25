import { OPERATOR_LOCATION, OPERATOR_NAME, PUBLIC_CONTACT_EMAIL } from "@/lib/config";
import { COMPETITORS_CHECKED, rival, teamMonthlyUsd } from "@/lib/competitor-prices";
import { PLANS, TRIAL_DAYS, TRIAL_LIMITS, formatPrice, type Plan, type PlanId } from "@/lib/pricing";

/**
 * The guide pages: one page per question a small business types into Google
 * or asks an AI assistant. Added 23 Nov 2026, after an SEO/GEO check found the
 * site had five indexable pages, two of them legal, and "Postbox" on its own
 * belongs in search to a desktop email client.
 *
 * ── HOW EACH PAGE IS WRITTEN ──
 * The `answer` is the first thing on the page and answers the title's question
 * in two sentences, naming Postbox: that paragraph is what a search snippet
 * or an AI assistant quotes. Everything below it supports it.
 *
 * ── WHAT MAY BE CLAIMED ──
 * Only what the product does today. No assignment, no live chat, no knowledge
 * base, no automations, and the pages say so where a reader would ask. Every
 * price of ours comes from lib/pricing.ts, never typed here
 * (tests/guides.test.ts fails on a literal one).
 *
 * A competitor's price is the one thing that rots on its own. Each comparison
 * carries the month it was checked and a link to the source, shown on the
 * page, so a stale figure is visibly dated rather than silently wrong.
 */

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  points?: string[];
};

export type GuideComparison = {
  /** Column heading for the other product. */
  them: string;
  /** The month the competitor's figures were checked, e.g. "November 2026". */
  checked: string;
  source: { label: string; href: string };
  rows: { label: string; postbox: string; them: string }[];
};

export type Guide = {
  /** Route, from the site root. Each has app/<path>/page.tsx. */
  path: string;
  /** Tab title, before " | Postbox". */
  title: string;
  /** Meta description: what the search result says under the title. */
  description: string;
  kicker: string;
  h1: string;
  /** The answer, first, in plain words. Quoted by search and AI. */
  answer: string;
  comparison?: GuideComparison;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
};

function plan(id: PlanId): Plan {
  const found = PLANS.find((p) => p.id === id);
  if (!found) throw new Error(`No plan ${id}`);
  return found;
}
const HELP_SCOUT = rival("Help Scout");
const STARTER = plan("starter");
const GROWTH = plan("growth");
const BUSINESS = plan("business");
const FROM = formatPrice(STARTER.price);
const people = (n: number) => (n === 1 ? "1 person" : `up to ${n} people`);

const PLAN_LINES = PLANS.map(
  (p) =>
    `${p.name}, ${formatPrice(p.price)} a month: ${people(p.limits.seats)}, ${p.limits.ticketsPerMonth.toLocaleString("en-GB")} conversations a month, ${
      p.limits.subscribers > 0
        ? `newsletters to up to ${p.limits.subscribers.toLocaleString("en-GB")} subscribers`
        : "no newsletters"
    }.`,
);

const TRIAL_LINE = `Every plan starts with a ${TRIAL_DAYS}-day free trial (or ${TRIAL_LIMITS.tickets} conversations, whichever comes first), and the trial does not ask for a card.`;

const COSTS: GuideSection = {
  heading: "What it costs",
  paragraphs: [
    `One flat price per business, not per person. ${TRIAL_LINE}`,
  ],
  points: PLAN_LINES,
};

const KEEP_ADDRESS = {
  q: "Do I keep my own email address?",
  a: "Yes. Customers keep writing to the address they already use. You forward it to the address Postbox gives you, and every email arrives in the shared inbox.",
};

const NOT_THE_APP = {
  q: "Is this the Postbox email app?",
  a: "No. That is a desktop email program from a different company. This Postbox is a shared inbox and newsletter service for small businesses, at postbox.help.",
};

export const GUIDES: Guide[] = [
  {
    path: "/shared-inbox",
    title: "Shared team inbox for UK small businesses",
    description: `One inbox your whole team answers customers from: your contact form and your info@ or support@ email together. For UK small businesses, from ${FROM} a month.`,
    kicker: "Shared inbox",
    h1: "A shared inbox for a small business",
    answer: `A shared inbox, or team inbox, is one inbox a whole team reads and replies from, so every customer gets one answer and nobody's email sits unread in one person's account. Postbox gives a small business exactly that, for its website contact form and its support email together, from ${FROM} a month.`,
    sections: [
      {
        heading: "Why one shared Gmail login stops working",
        paragraphs: [
          "Most small businesses start by sharing one email account. It works while one person answers. Once two people do, the same things start to go wrong:",
        ],
        points: [
          "Two people answer the same customer, or each thinks the other did and nobody does.",
          "There is no way to mark an email as dealt with for everyone, only as read.",
          "The password gets passed around, and has to change every time someone leaves.",
          "Contact form messages arrive as notification emails, mixed in with everything else.",
        ],
      },
      {
        heading: "How Postbox works",
        paragraphs: [
          "Every message from your website's contact form, and every email to your support address, arrives in one list, labelled with where it came from.",
          "Anyone on the team can open a conversation and reply. The customer gets an ordinary email from your business, and their answer comes back into the same thread. When it is dealt with, mark it Done, and it leaves everyone's To reply list.",
        ],
        points: [
          "Each customer's earlier conversations, beside the one you are reading.",
          "Notes on a customer that only your team sees.",
          "Out-of-hours auto-replies, so nobody waits until Monday wondering.",
          "A warning on the thread if your reply bounced.",
        ],
      },
      {
        heading: "Who it is for",
        paragraphs: [
          "Small businesses with one to ten people answering customers: shops, trades, studios, salons, agencies. It runs in the browser on a computer or a phone, with nothing to install.",
          "It is not a call-centre help desk. There is no live chat, no help-centre articles and no rules that hand conversations to particular people. If you need those, a larger help desk will suit you better.",
        ],
      },
      COSTS,
    ],
    faq: [
      KEEP_ADDRESS,
      {
        q: "Will customers know I use Postbox?",
        a: "Your replies arrive as ordinary emails with your business's name on them, and the customer replies as they would to any email.",
      },
      {
        q: "How many people can use it?",
        a: `${STARTER.name} is for ${people(STARTER.limits.seats)}, ${GROWTH.name} ${people(GROWTH.limits.seats)} and ${BUSINESS.name} ${people(BUSINESS.limits.seats)}. The price is per business, not per person.`,
      },
      {
        q: "Do I need to install anything?",
        a: "No. Postbox runs in your web browser, on a computer or a phone.",
      },
      NOT_THE_APP,
    ],
  },

  {
    path: "/contact-form-to-inbox",
    title: "Send your website contact form to a shared inbox",
    description: "Connect the contact form your website already has to a shared inbox. Every enquiry becomes a conversation your team can answer, and nothing gets lost.",
    kicker: "Contact forms",
    h1: "Send your website's contact form to a shared inbox",
    answer: "Postbox connects to the contact form your website already has, so every enquiry arrives in a shared inbox as a conversation, labelled as from your form. Your team replies from there, and the customer gets an ordinary email back.",
    sections: [
      {
        heading: "Why contact form enquiries go missing",
        paragraphs: [
          "A website form usually emails one person. From there, enquiries get lost in ordinary ways:",
        ],
        points: [
          "They land in one person's inbox, and wait while that person is off.",
          "They get filtered as spam, because form notifications look automated.",
          "Hitting reply can answer the website, not the customer.",
          "Nobody can tell which enquiries have been answered.",
        ],
      },
      {
        heading: "How it connects",
        paragraphs: [
          "Postbox gives you a short set of instructions, under Settings and then Install, to hand to the AI assistant you edit your website with, or to whoever built your site. It finds the form you already have and points it at Postbox. Your form keeps its look and its fields.",
          "It works with the forms on Shopify, WordPress and hand-built websites. If your website builder will not let you change the form, forward the emails it sends instead: anything sent or forwarded to your Postbox address arrives in the inbox too.",
        ],
      },
      {
        heading: "Your support email, in the same place",
        paragraphs: [
          "Forward your support address to Postbox and emails from customers sit in the same list as form enquiries, each labelled with where it came from. One place to check, one place to answer.",
        ],
      },
      COSTS,
    ],
    faq: [
      {
        q: "Do I have to change how my form looks?",
        a: "No. Postbox uses the form you already have, with its own design and fields.",
      },
      {
        q: "I do not edit my own website. Can I still use it?",
        a: "Yes. Send the instructions to whoever looks after your website, or forward the emails your form already sends to your Postbox address.",
      },
      {
        q: "How long does it take to set up?",
        a: "Once your inbox is ready, connecting the form usually takes a few minutes. Send yourself a test message to see it arrive.",
      },
      KEEP_ADDRESS,
    ],
  },

  {
    path: "/newsletters-for-small-business",
    title: "Email newsletters for UK small businesses",
    description: `Simple email marketing: newsletters to customers who signed up on your website, consent recorded, replies in your shared inbox. From ${formatPrice(GROWTH.price)} a month.`,
    kicker: "Newsletters",
    h1: "Newsletters for a small business, sent from your inbox",
    answer: `Postbox sends newsletters to the people who signed up on your website, keeps a record of when and where each one agreed, and puts any replies into your shared inbox. Newsletters are included on ${GROWTH.name} (${formatPrice(GROWTH.price)} a month) and ${BUSINESS.name} (${formatPrice(BUSINESS.price)} a month).`,
    sections: [
      {
        heading: "What is included",
        paragraphs: [
          "Everything a small business needs to email its customers properly, and nothing it has to learn first:",
        ],
        points: [
          "A signup form for your website, and a signup page Postbox hosts for you.",
          "A record of when each subscriber signed up and the page they did it on.",
          "One-click unsubscribe in every newsletter, without logging in.",
          "Bounced addresses, and anyone who marks you as spam, dropped automatically.",
          "Your postal address in every message, as the law requires.",
          "Each reader greeted by name, or with “Hi there” if you do not have one.",
          "A header image and a grid of your products, with prices and links.",
          "Replies to a newsletter arrive in your inbox as conversations.",
        ],
      },
      {
        heading: "Why only people who signed up",
        paragraphs: [
          "Nobody can be added to a Postbox list by hand or by import. Everyone on it filled in your form themselves. That is what keeps newsletters out of spam folders, and it means you can show any customer exactly why they are on your list.",
        ],
      },
      {
        heading: "Bringing the list you already have",
        paragraphs: [
          "Send your current list one last email from your old tool, with a link to your Postbox signup page. Everyone who signs up joins your new list with a record that they asked to.",
        ],
      },
      {
        heading: "What it costs",
        paragraphs: [
          `Newsletters come with the shared inbox. ${formatPrice(STARTER.price)} a month gets you the inbox alone. ${TRIAL_LINE}`,
        ],
        points: PLANS.filter((p) => p.limits.subscribers > 0).map(
          (p) =>
            `${p.name}, ${formatPrice(p.price)} a month: up to ${p.limits.subscribers.toLocaleString("en-GB")} subscribers and ${p.limits.emailsPerMonth.toLocaleString("en-GB")} emails a month.`,
        ),
      },
    ],
    faq: [
      {
        q: "Can I import my mailing list?",
        a: "No, by design. Invite your current list to sign up again instead: everyone who does arrives with their own consent record.",
      },
      {
        q: "Is it built for UK rules on marketing email?",
        a: "It keeps the records those rules expect: who signed up, when, and where. Every newsletter carries an unsubscribe link and your postal address. Whether your content is compliant is still up to you.",
      },
      {
        q: "Does it do automated email sequences?",
        a: "No. Postbox sends newsletters you write and send yourself. For automated sequences, A/B tests or a large list, a dedicated email marketing tool fits better.",
      },
      NOT_THE_APP,
    ],
  },

  {
    path: "/vs/gmail",
    title: "Postbox vs a shared Gmail inbox",
    description: "Gmail is fine when one person answers customers. When a shared Gmail login or Google Group stops working for a small team, and what Postbox does instead.",
    kicker: "Compare",
    h1: "Postbox or a shared Gmail inbox?",
    answer: `Gmail works well while one person answers customers. Once two or more people share the job, a shared login or a Google Group makes it hard to tell what has been answered; Postbox is a shared inbox built for that, from ${FROM} a month for the whole business.`,
    comparison: {
      them: "Gmail",
      checked: COMPETITORS_CHECKED,
      source: {
        label: "Google Workspace pricing",
        href: "https://workspace.google.com/intl/en_uk/pricing",
      },
      rows: [
        {
          label: "Price",
          postbox: `From ${FROM} a month for the business`,
          them: "Free, or Google Workspace from £5.90 a user a month (yearly, before VAT)",
        },
        {
          label: "A team answering together",
          postbox: "Everyone works in one inbox, with their own login",
          them: "Share one login, or set up a Google Groups collaborative inbox",
        },
        {
          label: "Marking an email as dealt with",
          postbox: "To reply and Done, the same for everyone",
          them: "Read or unread, per person",
        },
        {
          label: "Website contact form",
          postbox: "Each enquiry is a conversation, labelled as from your form",
          them: "Arrives as a notification email",
        },
        {
          label: "Private notes on a customer",
          postbox: "Yes",
          them: "No",
        },
        {
          label: "Newsletters",
          postbox: `Included from ${formatPrice(GROWTH.price)} a month, with consent records`,
          them: "Not built for it; daily sending limits apply",
        },
      ],
    },
    sections: [
      {
        heading: "When Gmail is enough",
        paragraphs: [
          "If you answer every customer yourself and get a handful of emails a week, keep using Gmail. Postbox earns its price when more than one person answers, or when enquiries come from both a contact form and an email address.",
        ],
      },
      {
        heading: "Where a shared Gmail gets difficult",
        paragraphs: [
          "Sharing one Gmail login means a shared password, and nothing to show who has already answered. Google's collaborative inbox, set up through Google Groups, adds some of that, but it lives in a separate screen from Gmail, so the team works in two places.",
          "Postbox is one inbox the whole team signs in to, each with their own login. A conversation stays in To reply until someone marks it Done, so everyone can see what is still waiting.",
        ],
      },
      {
        heading: "Keeping Gmail as well",
        paragraphs: [
          "You do not have to leave Gmail. Forward your support address to Postbox, and customer emails go to the shared inbox while your own mail stays where it is.",
        ],
      },
    ],
    faq: [
      KEEP_ADDRESS,
      {
        q: "Can I send newsletters from Gmail instead?",
        a: "Gmail limits how many people you can email in a day and keeps no record of who agreed to hear from you. Postbox newsletters go only to people who signed up, with their consent recorded.",
      },
      NOT_THE_APP,
    ],
  },

  {
    path: "/vs/help-scout",
    title: "Postbox vs Help Scout",
    description: "Help Scout is a full help desk priced per user. Postbox is a shared inbox with newsletters for small UK businesses, one flat price in pounds. How to choose.",
    kicker: "Compare",
    h1: "Postbox or Help Scout?",
    answer: `Help Scout is a full help desk for support teams, with live chat, help-centre articles and AI answers, priced per user in US dollars. Postbox is a simpler shared inbox with newsletters for small UK businesses, at one flat price in pounds: ${formatPrice(GROWTH.price)} a month covers ${people(GROWTH.limits.seats)}.`,
    comparison: {
      them: "Help Scout",
      checked: COMPETITORS_CHECKED,
      source: { label: "Help Scout pricing", href: "https://www.helpscout.com/pricing/" },
      rows: [
        {
          label: "Price",
          postbox: `${PLANS.map((p) => formatPrice(p.price)).join(", ")} a month, per business`,
          them: `From $${HELP_SCOUT.perUserUsd} a user a month, billed yearly`,
        },
        {
          label: `A team of ${GROWTH.limits.seats}`,
          postbox: `${formatPrice(GROWTH.price)} a month`,
          them: `From $${teamMonthlyUsd(HELP_SCOUT, GROWTH.limits.seats)} a month`,
        },
        {
          label: "Shared inbox",
          postbox: "Yes",
          them: "Yes",
        },
        {
          label: "Newsletters",
          postbox: "Included, with consent records",
          them: "Not included",
        },
        {
          label: "Live chat and help-centre articles",
          postbox: "No",
          them: "Yes",
        },
        {
          label: "AI answers",
          postbox: "No",
          them: "Add-on, charged per answer",
        },
        {
          label: "Billed in",
          postbox: "Pounds",
          them: "US dollars",
        },
      ],
    },
    sections: [
      {
        heading: "Choose Help Scout if",
        paragraphs: [
          "You run a support team that needs live chat, a public help centre, reports on response times, or rules that route conversations to particular people. Help Scout does all of that well, and Postbox does none of it.",
        ],
      },
      {
        heading: "Choose Postbox if",
        paragraphs: [
          "You are a small business that wants its contact form and support email answered from one place, and to send a newsletter to customers who signed up, without paying per person or in dollars. Postbox is run from Scotland, and the app and its data are hosted in London.",
        ],
      },
      COSTS,
    ],
    faq: [
      {
        q: "Can I move from Help Scout to Postbox?",
        a: "Yes. Point your support address and contact form at Postbox and new conversations arrive there. Past conversations are not imported.",
      },
      KEEP_ADDRESS,
      NOT_THE_APP,
    ],
  },

  {
    path: "/vs/mailchimp",
    title: "Postbox vs Mailchimp",
    description: "Mailchimp is a full email marketing platform. Postbox is a shared inbox with simple newsletters, and replies land in your inbox. How to choose.",
    kicker: "Compare",
    h1: "Postbox or Mailchimp?",
    answer: `Mailchimp is a full email marketing platform, with automations, A/B tests and integrations, priced by the number of contacts. Postbox is a shared inbox that also sends simple newsletters: ${formatPrice(GROWTH.price)} a month covers the inbox and up to ${GROWTH.limits.subscribers.toLocaleString("en-GB")} subscribers, and replies land where your team already works.`,
    comparison: {
      them: "Mailchimp",
      checked: COMPETITORS_CHECKED,
      source: { label: "Mailchimp pricing", href: "https://mailchimp.com/pricing/" },
      rows: [
        {
          label: "Price",
          postbox: `${formatPrice(GROWTH.price)} a month with up to ${GROWTH.limits.subscribers.toLocaleString("en-GB")} subscribers`,
          them: "Free up to 250 contacts; paid plans from $13 a month, rising with contacts",
        },
        {
          label: "Shared inbox for customer email",
          postbox: "Yes, the main product",
          them: "No",
        },
        {
          label: "Replies to a newsletter",
          postbox: "Arrive in your shared inbox as conversations",
          them: "Go to an email address you choose",
        },
        {
          label: "Automations and A/B tests",
          postbox: "No",
          them: "Yes",
        },
        {
          label: "Importing a list",
          postbox: "No: subscribers sign up themselves",
          them: "Yes",
        },
      ],
    },
    sections: [
      {
        heading: "Choose Mailchimp if",
        paragraphs: [
          "Email marketing is a big part of how you sell: automated welcome sequences, abandoned-basket emails, testing subject lines, or a list in the tens of thousands. Mailchimp is built for that and Postbox is not.",
        ],
      },
      {
        heading: "Choose Postbox if",
        paragraphs: [
          "You send a newsletter now and then to customers who asked for it, and you also answer customer emails as a team. Postbox does both in one place, so a customer's reply to your newsletter is a conversation your team can answer like any other.",
        ],
      },
      COSTS,
    ],
    faq: [
      {
        q: "Can I bring my Mailchimp list?",
        a: "Not by importing it. Send your list one last email from Mailchimp with a link to your Postbox signup page, and everyone who signs up joins with their own consent record.",
      },
      {
        q: "Does Postbox have email templates?",
        a: "It has one clean layout that works in every inbox, with a header image and a grid of products. There is no drag-and-drop designer.",
      },
      NOT_THE_APP,
    ],
  },

  /*
    Added 25 Nov 2026. Most UK small businesses run their email on Microsoft
    365, and its shared mailbox is the free thing Postbox is weighed against.
    Facts from Microsoft's own page (linked below): a shared mailbox needs no
    licence of its own up to 50 GB, everyone using it needs a licensed
    mailbox, and its read state is the mailbox's, so it is shared. Automatic
    forwarding to outside addresses is off by default in Microsoft 365's
    outbound spam policy.
  */
  {
    path: "/vs/outlook",
    title: "Postbox vs an Outlook shared mailbox",
    description: `An Outlook shared mailbox comes with Microsoft 365. When it stops being enough for a small team answering customers, and what Postbox does instead.`,
    kicker: "Compare",
    h1: "Postbox or an Outlook shared mailbox?",
    answer: `An Outlook shared mailbox comes with most Microsoft 365 business plans and works while a team handles a few emails a day. It cannot show what has been answered or turn contact form enquiries into conversations; Postbox does both, from ${FROM} a month for the whole business, and you keep Outlook for everything else.`,
    comparison: {
      them: "Outlook shared mailbox",
      checked: COMPETITORS_CHECKED,
      source: {
        label: "Microsoft: about shared mailboxes",
        href: "https://learn.microsoft.com/en-us/microsoft-365/admin/email/about-shared-mailboxes",
      },
      rows: [
        {
          label: "Price",
          postbox: `From ${FROM} a month for the business`,
          them: "No licence of its own up to 50 GB; everyone using it needs a paid Microsoft 365 mailbox",
        },
        {
          label: "Marking an email as dealt with",
          postbox: "To reply and Done, the same for everyone",
          them: "Read or unread, flags and categories",
        },
        {
          label: "Website contact form",
          postbox: "Each enquiry is a conversation, labelled as from your form",
          them: "Arrives as a notification email",
        },
        {
          label: "Adding a colleague",
          postbox: "Invite them from Settings",
          them: "Your Microsoft 365 administrator grants access",
        },
        {
          label: "Newsletters",
          postbox: `Included from ${formatPrice(GROWTH.price)} a month, with consent records`,
          them: "Not built for it; sending limits apply",
        },
      ],
    },
    sections: [
      {
        heading: "When a shared mailbox is enough",
        paragraphs: [
          "If your team already works in Outlook and gets a few customer emails a day, a shared mailbox such as info@ costs nothing extra and does the job. Postbox earns its price when several people answer, or when enquiries come from your website's contact form as well as by email.",
        ],
      },
      {
        heading: "Where it gets difficult",
        paragraphs: [
          "Everyone sees the same read and unread state, so an email one person opened looks dealt with to everybody, answered or not. Contact form enquiries arrive as notification emails mixed in with the rest. Nothing records which customer emails are still waiting.",
          "In Postbox a conversation stays in To reply until someone marks it Done, each enquiry is labelled with where it came from, and each customer's earlier conversations sit beside the one you are reading.",
        ],
      },
      {
        heading: "Keeping Outlook as well",
        paragraphs: [
          "You do not have to leave Microsoft 365. Forward your info@ or support@ address to Postbox and customer emails go to the shared inbox, while everyone's own mail stays in Outlook.",
          "Microsoft 365 blocks automatic forwarding to outside addresses by default, so your administrator allows it for that one mailbox first. Nothing else about your email changes, and there are no DNS records to add.",
        ],
      },
      COSTS,
    ],
    faq: [
      KEEP_ADDRESS,
      {
        q: "Why is my Microsoft 365 forwarding not working?",
        a: "Microsoft 365 blocks automatic forwarding to outside addresses unless your administrator allows it, in the outbound spam policy in Microsoft Defender. Allow it for the mailbox you are forwarding, then send yourself a test.",
      },
      {
        q: "Does Postbox replace Microsoft 365?",
        a: "No. Your own email, calendar and files stay in Microsoft 365. Postbox is where your team answers customer emails and contact form enquiries.",
      },
      NOT_THE_APP,
    ],
  },

  {
    path: "/faq",
    title: "Questions about Postbox",
    description: `Answers to what people ask before using Postbox: what it is, what it costs, setting it up, your email address, your data, and cancelling. From ${FROM} a month.`,
    kicker: "Questions",
    h1: "Questions about Postbox",
    answer: `Postbox is a shared inbox and newsletter service for small businesses in the UK, run by ${OPERATOR_NAME} in ${OPERATOR_LOCATION}. Your website's contact form and your support email arrive in one inbox your team answers from, and plans start at ${FROM} a month.`,
    sections: [],
    faq: [
      NOT_THE_APP,
      {
        q: "What does it cost?",
        a: `${PLAN_LINES.join(" ")} ${TRIAL_LINE}`,
      },
      {
        q: "How do I set it up?",
        a: "Sign up, and once your inbox is ready, connect your website's contact form and forward your support email to the address Postbox gives you. Connecting them usually takes a few minutes.",
      },
      KEEP_ADDRESS,
      {
        q: "Does it work on a phone?",
        a: "Yes. Postbox runs in the browser on a phone or a computer. There is no app to install.",
      },
      {
        q: "Do I need to change my DNS or domain settings?",
        a: "No. Replies and newsletters go out from Postbox's own verified mail servers with your business's name on them, so there are no records to add. You forward your email and connect your form, and that is all.",
      },
      {
        q: "Does it work with Outlook, Microsoft 365 or Gmail?",
        a: "Yes. Keep your email where it is and forward your info@ or support@ address to Postbox. Microsoft 365 blocks forwarding to outside addresses until your administrator allows it for that mailbox.",
      },
      {
        q: "Is Postbox a help desk?",
        a: "It is a simpler shared inbox. There is no live chat, no help-centre articles and no rules that hand conversations to particular people. It suits small teams who want one place to answer customers, with newsletters included.",
      },
      {
        q: "What happens to enquiries if I stop paying?",
        a: "Enquiries from your customers keep arriving and keep being recorded whatever your billing state. Sending newsletters is what stops.",
      },
      {
        q: "Can I cancel?",
        a: "Yes, at any time, from Settings and then Billing. Your plan runs to the end of the month you have paid for. There is no minimum term.",
      },
      {
        q: "Where is my data kept?",
        a: "The app and its database are hosted in London. The privacy policy lists every company that processes data for Postbox.",
      },
      {
        q: "Who is behind Postbox?",
        a: `${OPERATOR_NAME}, in ${OPERATOR_LOCATION}. Questions go straight to ${OPERATOR_NAME} at ${PUBLIC_CONTACT_EMAIL}.`,
      },
    ],
  },
];

/** The guide at a path. Throws on a typo, so a page cannot render nothing. */
export function guide(path: string): Guide {
  const found = GUIDES.find((g) => g.path === path);
  if (!found) throw new Error(`No guide at ${path}`);
  return found;
}
