import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RateLimitResult } from "@/lib/rate-limit";
import type { Workspace } from "@/db/schema";

/**
 * "Report a bug" (Jordan, 22 Nov 2026): above Sign out in the account menu, a
 * modal whose report lands in the operator console for review.
 */

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/viewer", () => ({ resolveViewer: vi.fn() }));
vi.mock("@/lib/rate-limit-store", () => ({ rateLimitDurable: vi.fn() }));
vi.mock("@/lib/config", () => ({ APP_URL: "https://postbox.test", EMAIL_FROM_ADDRESS: "replies@postbox.test" }));
vi.mock("@/lib/admin", () => ({ listAdmins: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendBugReportAlert: vi.fn() }));
vi.mock("@/lib/bug-reports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bug-reports")>()),
  createBugReport: vi.fn(async () => undefined),
}));

const { readBugReportFields, reportedPage, BUG_REPORT_MAX } = await import("../lib/bug-reports");
const bugs = await import("../lib/bug-reports");
const { POST } = await import("../app/api/bug-reports/route");
const { auth } = await import("@clerk/nextjs/server");
const { resolveViewer } = await import("@/lib/viewer");
const { rateLimitDurable } = await import("@/lib/rate-limit-store");
const { listAdmins } = await import("@/lib/admin");
const { sendBugReportAlert } = await import("@/lib/email");
type Admins = Awaited<ReturnType<typeof listAdmins>>;
type AlertResult = Awaited<ReturnType<typeof sendBugReportAlert>>;

type Viewer = Awaited<ReturnType<typeof resolveViewer>>;
type AuthResult = Awaited<ReturnType<typeof auth>>;
const bakery = { id: 42, name: "Bakery" } satisfies Partial<Workspace> as Workspace;
const allowed = { ok: true, remaining: 5, limit: 10, retryAfterSeconds: 0 } satisfies RateLimitResult;

const post = (body: unknown) =>
  POST(new Request("http://postbox.test/api/bug-reports", { method: "POST", body: JSON.stringify(body) }));

describe("what a report keeps", () => {
  it("needs words, and caps them", () => {
    expect(readBugReportFields({ message: "  " })).toEqual({ ok: false, error: "Say what went wrong." });
    expect(readBugReportFields({ message: "x".repeat(BUG_REPORT_MAX + 1) }).ok).toBe(false);
    expect(readBugReportFields({ message: " The Send button did nothing ", page: "/tickets/9" })).toEqual({
      ok: true,
      message: "The Send button did nothing",
      page: "/tickets/9",
    });
  });

  it("keeps only the path of the page, never its query or a foreign address", () => {
    // A query can carry a search term or a token; the path says where.
    expect(reportedPage("/search?q=private#x")).toBe("/search");
    expect(reportedPage("https://evil.example/x")).toBeNull();
    expect(reportedPage("//evil.example")).toBeNull();
    expect(reportedPage(42)).toBeNull();
    expect(reportedPage("/" + "a".repeat(400))?.length).toBe(300);
  });
});

describe("POST /api/bug-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } satisfies Partial<AuthResult> as AuthResult);
    vi.mocked(resolveViewer).mockResolvedValue({
      isAdmin: false,
      email: "owner@bakery.test",
      workspace: bakery,
      agentEmail: "owner@bakery.test",
    } satisfies Viewer);
    vi.mocked(rateLimitDurable).mockResolvedValue(allowed);
    vi.mocked(listAdmins).mockResolvedValue([
      { id: 1, email: "jordan@postbox.test" },
      { id: 2, email: "ops@postbox.test" },
    ] satisfies Partial<Admins[number]>[] as Admins);
    vi.mocked(sendBugReportAlert).mockResolvedValue({ sent: true } satisfies AlertResult);
  });

  it("emails every operator about a new report, replying to the reporter", async () => {
    await post({ message: "Newsletter preview is blank", page: "/newsletters/write" });
    expect(vi.mocked(sendBugReportAlert).mock.calls[0][0]).toEqual({
      to: ["jordan@postbox.test", "ops@postbox.test"],
      from: "replies@postbox.test",
      reporterEmail: "owner@bakery.test",
      workspaceName: "Bakery",
      message: "Newsletter preview is blank",
      page: "/newsletters/write",
      consoleUrl: "https://postbox.test/admin?section=bugs",
    });
  });

  it("still files the report when the alert cannot be sent", async () => {
    vi.mocked(sendBugReportAlert).mockRejectedValue(new Error("Resend is down"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post({ message: "Broken" });
    expect(res.status).toBe(200);
    expect(bugs.createBugReport).toHaveBeenCalled();
    error.mockRestore();
  });

  it("sends no alert for a report it refused", async () => {
    await post({ message: "" });
    vi.mocked(rateLimitDurable).mockResolvedValue({ ...allowed, ok: false, remaining: 0 });
    await post({ message: "again" });
    expect(sendBugReportAlert).not.toHaveBeenCalled();
  });

  it("refuses a visitor who is not signed in", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } satisfies Partial<AuthResult> as AuthResult);
    expect((await post({ message: "hi" })).status).toBe(401);
    expect(bugs.createBugReport).not.toHaveBeenCalled();
  });

  it("files the report against the reporter and their workspace", async () => {
    const res = await post({ message: "Newsletter preview is blank", page: "/newsletters/write?id=3" });
    expect(res.status).toBe(200);
    expect(vi.mocked(bugs.createBugReport).mock.calls[0][0]).toEqual({
      workspaceId: 42,
      reporterClerkId: "user_1",
      reporterEmail: "owner@bakery.test",
      message: "Newsletter preview is blank",
      page: "/newsletters/write",
      userAgent: null,
    });
  });

  it("says what is wrong with an empty report", async () => {
    const res = await post({ message: "" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Say what went wrong." });
  });

  it("is rate limited per person", async () => {
    vi.mocked(rateLimitDurable).mockResolvedValue({ ...allowed, ok: false, remaining: 0 });
    expect((await post({ message: "again" })).status).toBe(429);
    expect(bugs.createBugReport).not.toHaveBeenCalled();
    expect(vi.mocked(rateLimitDurable).mock.calls[0][0]).toBe("bug-report:user_1");
  });
});

describe("where it lives", () => {
  it("sits above Sign out in the account menu", () => {
    const shell = readFileSync(join(process.cwd(), "components/mail/MailNavShell.tsx"), "utf8");
    const menu = shell.slice(shell.indexOf('className="pbm-menu"'));
    const report = menu.indexOf("<ReportBug");
    const signOut = menu.indexOf("<AuditedSignOutButton");
    expect(report).toBeGreaterThan(-1);
    expect(report).toBeLessThan(signOut);
  });

  it("has its own pane in the operator console", () => {
    const ui = readFileSync(join(process.cwd(), "app/(admin)/admin/ui.tsx"), "utf8");
    expect(ui).toMatch(/"bugs"/);
  });
});
