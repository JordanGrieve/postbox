import { describe, expect, it } from "vitest";
import { clerkAppearance } from "../lib/clerk-appearance";

/**
 * Clerk's sign-in and sign-up card meets the same 44px target as the app.
 *
 * 22 Nov 2026 mobile journey test: "Continue with Google", the email field
 * and "Continue" were 32px tall — the first controls a new customer touches,
 * and the only ones in the product under 2.5.5's 44px (STYLE-GUIDE.md §4).
 */

const TAP = "var(--tap-min, 44px)";

describe("the Clerk card's controls", () => {
  const elements = clerkAppearance.elements as Record<string, Record<string, string>>;

  for (const key of ["socialButtonsBlockButton", "formFieldInput", "formButtonPrimary"]) {
    it(`${key} is at least 44px tall`, () => {
      expect(elements[key]?.minHeight).toBe(TAP);
    });
  }
});
