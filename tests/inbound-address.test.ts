import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "@/db/schema";

/**
 * hello@postbox.help is printed on every public page (21 Nov 2026). Before
 * this, mail to it reached the inbound webhook, matched no workspace, and was
 * dropped without trace. It now files into Postbox's own workspace — the one
 * POSTBOX_CONTACT_KEY names, which the /contact form already posts into.
 */

const config = vi.hoisted(() => ({
  INBOUND_DOMAIN: "postbox.help",
  PUBLIC_CONTACT_LOCAL_PART: "hello",
  POSTBOX_CONTACT_KEY: "cli_postbox" as string | null,
}));
vi.mock("@/lib/config", () => config);

const data = vi.hoisted(() => ({
  getWorkspaceByApiKey: vi.fn(),
  getWorkspaceByInboundEmail: vi.fn(),
}));
vi.mock("@/lib/data", () => data);
vi.mock("@/db", () => ({ db: {} }));

const { isPublicContactAddress, workspaceForInboundAddress } = await import(
  "@/lib/inbound-address"
);

const postbox = { id: 1, name: "Postbox" } satisfies Partial<Workspace> as Workspace;
const bakery = { id: 2, name: "Open Door Bakery" } satisfies Partial<Workspace> as Workspace;

beforeEach(() => {
  vi.clearAllMocks();
  config.POSTBOX_CONTACT_KEY = "cli_postbox";
  data.getWorkspaceByApiKey.mockResolvedValue(postbox);
  data.getWorkspaceByInboundEmail.mockResolvedValue(bakery);
});

describe("isPublicContactAddress", () => {
  it("matches hello@ on the inbound domain, in any case", () => {
    expect(isPublicContactAddress("hello@postbox.help", "postbox.help")).toBe(true);
    expect(isPublicContactAddress(" Hello@Postbox.Help ", "postbox.help")).toBe(true);
  });

  it("matches nothing else", () => {
    expect(isPublicContactAddress("hello@example.com", "postbox.help")).toBe(false);
    expect(isPublicContactAddress("hello-3fa@postbox.help", "postbox.help")).toBe(false);
    expect(isPublicContactAddress("ohello@postbox.help", "postbox.help")).toBe(false);
  });
});

describe("workspaceForInboundAddress", () => {
  it("files hello@ in Postbox's own workspace, by its key", async () => {
    expect(await workspaceForInboundAddress("hello@postbox.help")).toBe(postbox);
    expect(data.getWorkspaceByApiKey).toHaveBeenCalledWith("cli_postbox");
    expect(data.getWorkspaceByInboundEmail).not.toHaveBeenCalled();
  });

  it("leaves every client's own address to the normal lookup", async () => {
    expect(await workspaceForInboundAddress("bakery-3fa@postbox.help")).toBe(bakery);
    expect(data.getWorkspaceByApiKey).not.toHaveBeenCalled();
  });

  it("files hello@ nowhere when Postbox's own workspace is not configured", async () => {
    config.POSTBOX_CONTACT_KEY = null;
    expect(await workspaceForInboundAddress("hello@postbox.help")).toBeNull();
    expect(data.getWorkspaceByApiKey).not.toHaveBeenCalled();
  });
});
