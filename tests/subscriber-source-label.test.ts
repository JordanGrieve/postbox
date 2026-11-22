import { describe, expect, it } from "vitest";
import { sourceLabel } from "@/app/(dashboard)/subscribers/labels";

/*
  22 Nov 2026 gap run: the People list showed each subscriber's source as the
  raw stored value, "signup_form". `source` is free text ("footer_form",
  "shopify_import"), so it is labelled, never shown as a database value.
*/
describe("sourceLabel", () => {
  it("names the sources Postbox writes in the consent wording", () => {
    expect(sourceLabel("signup_form")).toBe("Signup form");
    expect(sourceLabel("checkout")).toBe("Checkout opt-in");
  });

  it("makes any other stored value readable", () => {
    expect(sourceLabel("footer_form")).toBe("Footer form");
    expect(sourceLabel("shopify-import")).toBe("Shopify import");
  });

  it("says so when nothing was recorded", () => {
    expect(sourceLabel(null)).toBe("Source unknown");
    expect(sourceLabel("  ")).toBe("Source unknown");
  });
});
