import { OPEN_SIGNUP } from "./config";

/**
 * The public site's call to action, in one place.
 *
 * ── THE BUTTON SAYS THE SAME THING EITHER WAY ──
 * Until 21 Nov 2026 the button depended on OPEN_SIGNUP: with sign-up closed
 * the homepage offered "See pricing" and "ask your provider for access", and
 * every pricing button said "Get in touch". There was no way for a business
 * to start, and "your provider" told a bakery owner they needed a middleman
 * they did not have.
 *
 * Since the request-for-access flow (/no-access, 21 Nov 2026) there is a real
 * path in both modes, and it starts at the same place: /sign-up. With sign-up
 * open the account gets a workspace at once. With it closed, the person signs
 * up, names their business in one short form, and is approved by hand. The
 * button is "Start free trial" in both cases, because that is what it starts;
 * the note under it says what happens next, which is the only part that
 * differs.
 *
 * "Usually within a day" is a promise Jordan keeps by hand: a request emails
 * the operators the moment it is sent (lib/email.ts, sendAccessRequestAlert).
 */
export const TRIAL_HREF = "/sign-up";
export const TRIAL_CTA = "Start free trial";

export const TRIAL_NOTE = OPEN_SIGNUP
  ? "No card needed. Set up in a couple of minutes."
  : "No card needed. We set up each business by hand: sign up, tell us your business name, and we'll email you when your inbox is ready, usually within a day.";
