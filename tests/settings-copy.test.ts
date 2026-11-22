import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Settings say what a thing is, not why (STYLE-GUIDE.md, "Explanatory boxes":
 * Jordan, 9 Sep 2026, "these should be known, we will have a FAQ thing
 * later"). A review on 22 Nov 2026 found the standing explanations had crept
 * back — under almost every row of Website & email, as developer talk on
 * Forms, and as a sentence on Team — and Jordan asked for them cut.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}/g, "");

const WEBSITE = code("app/(dashboard)/settings/website/page.tsx");
const FORMS = code("app/(dashboard)/settings/forms/page.tsx");
const TEAM = code("app/(dashboard)/settings/team/page.tsx");
const AUTO_REPLY = code("app/(dashboard)/settings/auto-reply/AutoReplyDetails.tsx");

describe("the explanations that were cut stay cut", () => {
  it("Website & email", () => {
    for (const gone of [
      "Messages from your website arrive in your inbox",
      "New subscribers join your list from your website",
      "Each form gets its own key",
      "Forward your shop email to this and it lands in your inbox",
      "When customers reply, it comes back to the same conversation",
      "so keep it somewhere safe",
    ]) {
      expect(WEBSITE, gone).not.toContain(gone);
    }
    expect(WEBSITE).toContain("Last message ${timeAgo(last.contactForm)}");
    expect(WEBSITE).toContain("Contains customer details, so keep it safe.");
  });

  it("Forms speaks in forms, not keys", () => {
    expect(FORMS).not.toContain("Your original form key");
    expect(FORMS).not.toContain("not tied to a named form");
    expect(FORMS).not.toContain("install screen");
    expect(FORMS).toContain("Main form");
  });

  it("Team says the count, not a paragraph", () => {
    expect(TEAM).not.toContain("and that&rsquo;s everyone");
    expect(TEAM).not.toContain("upgrade in Settings → Billing, or remove somebody first");
    expect(TEAM).toMatch(/of \{limit\}/);
  });

  it("Auto-reply does not restate the rows below it", () => {
    expect(AUTO_REPLY).not.toContain("as set below");
  });
});
