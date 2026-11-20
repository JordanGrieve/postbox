import { describe, it, expect, vi } from "vitest";

/**
 * The operator console page checks for an admin ITSELF, before reading data.
 *
 * app/(admin)/layout.tsx already calls requireAdmin(), and for a long time that
 * was the only check. It is not enough: Next skips layouts on client-side
 * navigation (partial rendering), so a page that lists every tenant, every
 * admin and every client's usage cannot rely on its layout having run. Next's
 * own authentication guide says to check close to the data.
 *
 * requireAdmin is replaced with one that throws a sentinel, the way the real
 * one throws Next's redirect for a non-admin. If the page reaches for its data
 * before asking, the data modules hit the throwing db stub instead and the
 * rejection is a DIFFERENT error, so this cannot pass by accident.
 */

const NOT_AN_ADMIN = new Error("requireAdmin refused: not an operator");

vi.mock("@/lib/viewer", () => ({
  requireAdmin: vi.fn(async () => {
    throw NOT_AN_ADMIN;
  }),
  resolveViewer: vi.fn(async () => ({
    email: "tenant@example.com",
    isAdmin: false,
    workspace: null,
  })),
}));

describe("app/(admin)/admin/page.tsx", () => {
  it("refuses a non-admin before it reads any tenant's data", async () => {
    const { default: AdminHomePage } = await import(
      "../app/(admin)/admin/page"
    );

    await expect(
      AdminHomePage({ searchParams: Promise.resolve({}) }),
    ).rejects.toBe(NOT_AN_ADMIN);
  });
});
