import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
  The console's sign-out, Jordan, 17 Nov 2026: "put this at the bottom and
  just 1 button logout admin". One button, no "Signed in as" card, and on a
  phone it is the last thing on the page.
*/

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

describe("console log out", () => {
  it("is one button and nothing else in the sidebar foot", () => {
    const page = read("app/(admin)/admin/page.tsx");
    const start = page.indexOf('<div className="pba-side-foot">');
    expect(start, "no sidebar foot").toBeGreaterThan(0);
    const foot = page.slice(start, page.indexOf("</nav>", start));
    expect(foot).toContain('<AuditedSignOutButton className="pba-btn pba-logout">');
    expect(foot).toContain("Log out of admin");
    expect(foot).not.toMatch(/Signed in as|whoami|viewer\.email/);
    expect(foot.match(/<button|<AuditedSignOutButton/g)?.length).toBe(1);
  });

  it("is 44px and full width, and on a phone sits after the page content", () => {
    const css = read("app/admin.css");
    const btn = css.match(/\n\.pba-logout\s*\{([^}]*)\}/)?.[1];
    expect(btn, "no .pba-logout rule").toBeDefined();
    expect(btn).toContain("width: 100%");
    expect(btn).toContain("min-height: var(--tap-min, 44px)");

    const phoneStart = css.indexOf("@media (max-width: 980px) {");
    const phone = css.slice(phoneStart, css.indexOf("\n}", phoneStart));
    const foot = phone.match(/\.pba-side-foot\s*\{([^}]*)\}/g)?.join("\n") ?? "";
    expect(foot, "the foot is not moved to the end on a phone").toContain("order: 1");
    // order only works because the sidebar's rows are items of the page column.
    expect(phone).toMatch(/\.pba-side\s*\{\s*display: contents;/);
  });
});
