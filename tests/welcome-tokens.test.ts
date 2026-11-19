import { describe, it, expect } from "vitest";
import { toShownTokens, toStoredTokens } from "../lib/welcome-tokens";
import { DEFAULT_WELCOME_BODY, DEFAULT_WELCOME_SUBJECT } from "../lib/welcome";

/**
 * The welcome editor shows [First name] and [Business name]; what is saved and
 * sent is {first_name} and {company}. A mistake in either direction reaches a
 * real subscriber unattended: a token that is not translated back is sent as
 * literal square brackets, and one translated wrongly is a different email.
 */
describe("the welcome email's tokens", () => {
  it("shows the stored tokens in words", () => {
    expect(toShownTokens("Thanks for signing up to {company}")).toBe(
      "Thanks for signing up to [Business name]",
    );
    expect(toShownTokens("Hi {first_name},")).toBe("Hi [First name],");
  });

  it("saves them back as the tokens the renderer knows", () => {
    expect(toStoredTokens("Hi [First name], from [Business name]")).toBe(
      "Hi {first_name}, from {company}",
    );
  });

  it("forgives case and spacing typed by hand", () => {
    expect(toStoredTokens("Hi [first name] / [ BUSINESS   NAME ]")).toBe(
      "Hi {first_name} / {company}",
    );
  });

  it("round-trips the default email exactly", () => {
    for (const text of [DEFAULT_WELCOME_SUBJECT, DEFAULT_WELCOME_BODY]) {
      const shown = toShownTokens(text);
      expect(shown).not.toContain("{");
      expect(toStoredTokens(shown)).toBe(text);
    }
  });

  it("leaves every other token and bracket alone", () => {
    const text = "Write to {email} [about anything] {unsubscribe_url}";
    expect(toShownTokens(text)).toBe(text);
    expect(toStoredTokens(text)).toBe(text);
  });

  it("translates every occurrence, not only the first", () => {
    expect(toStoredTokens("[First name] [First name]")).toBe("{first_name} {first_name}");
  });
});
