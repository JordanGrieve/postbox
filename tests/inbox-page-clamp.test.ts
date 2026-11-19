import { describe, it, expect, vi, beforeEach } from "vitest";

/*
  An out-of-range ?page= is clamped BEFORE the rows are read (CodeRabbit,
  PR 29). Marking the last conversation on the last page as done leaves
  ?page= one past the end; the list used to fetch that empty page and say
  "All caught up" over a tab that still had conversations.

  Calls the real page components with the query module stood in for, and
  checks which page they ask for.
*/

const h = vi.hoisted(() => ({
  listMailPage: vi.fn(async () => []),
  mailCounts: vi.fn(),
}));

vi.mock("@/lib/viewer", () => ({
  resolveViewer: async () => ({ workspace: { id: 3 }, isAdmin: false }),
}));
vi.mock("@/lib/onboarding-query", () => ({ getOnboardingProgress: async () => null }));
vi.mock("../app/(dashboard)/queries", async (orig) => ({
  ...(await orig<typeof import("../app/(dashboard)/queries")>()),
  listMailPage: h.listMailPage,
  mailCounts: h.mailCounts,
}));

const counts = {
  inbox: 50,
  closed: 10,
} satisfies Awaited<ReturnType<typeof import("../app/(dashboard)/queries").mailCounts>>;

beforeEach(() => {
  h.listMailPage.mockClear();
  h.mailCounts.mockResolvedValue(counts);
});

describe("the list reads the page it shows", () => {
  it("/inbox?page=9 with one page of To reply reads page 1", async () => {
    const { TICKETS_PAGE_SIZE } = await import("@/lib/data");
    const { default: InboxPage } = await import("../app/(dashboard)/inbox/page");
    await InboxPage({ searchParams: Promise.resolve({ page: "9" }) });
    const lastPage = Math.max(1, Math.ceil(counts.inbox / TICKETS_PAGE_SIZE));
    expect(h.listMailPage).toHaveBeenCalledWith(3, "inbox", lastPage);
  });

  it("an in-range page is read as asked", async () => {
    const { default: InboxPage } = await import("../app/(dashboard)/inbox/page");
    await InboxPage({ searchParams: Promise.resolve({ folder: "closed", page: "1" }) });
    expect(h.listMailPage).toHaveBeenCalledWith(3, "closed", 1);
  });
});
