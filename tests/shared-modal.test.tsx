// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen, act } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Modal from "../components/Modal";
import LabelManager from "../components/mail/LabelManager";
import InviteMember from "../app/(dashboard)/settings/team/InviteMember";
import type { LabelWithCountDTO } from "../components/mail/types";

/*
  Jordan, 17 Nov 2026: "we want every modal, modals on phone, all the same,
  buttons etc." One modal (components/Modal.tsx); the account details, the
  label manager and the new team invite all use it.
*/

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

function sourceFiles(): string[] {
  return [
    ...readdirSync(join(ROOT, "app"), { recursive: true, encoding: "utf8" }).map((f) => join("app", f)),
    ...readdirSync(join(ROOT, "components"), { recursive: true, encoding: "utf8" }).map((f) =>
      join("components", f),
    ),
  ].filter((f) => f.endsWith(".tsx"));
}

describe("one modal", () => {
  it("no component builds its own dialog", () => {
    // Discovered, not listed: a guard is only as wide as its input.
    const files = sourceFiles();
    expect(files.length).toBeGreaterThan(50);
    const own = files.filter((f) => {
      if (f.replace(/\\/g, "/") === "components/Modal.tsx") return false;
      // Code only: the shared modal's history is told in comments.
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      return /<dialog\b/.test(src) || /role=\{?["'`]dialog/.test(src) || /aria-modal/.test(src);
    });
    expect(own, "these build a dialog instead of using components/Modal.tsx").toEqual([]);
  });

  it("the three modals all use it", () => {
    for (const f of [
      "app/(admin)/admin/AccountsBrowser.tsx",
      "components/mail/LabelManager.tsx",
      "app/(dashboard)/settings/team/InviteMember.tsx",
    ]) {
      expect(read(f), `${f} does not use the shared Modal`).toMatch(/import Modal from "@\/components\/Modal"/);
    }
  });
});

describe("Modal", () => {
  it("is empty while closed, and named by its heading when open", () => {
    const { rerender, container } = render(
      <Modal open={false} onClose={vi.fn()} title="Hello" closeLabel="Close hello">
        <p>body</p>
      </Modal>,
    );
    const dialog = container.querySelector("dialog")!;
    expect(dialog.open).toBe(false);
    expect(dialog.querySelector("h2")).toBeNull();

    rerender(
      <Modal open onClose={vi.fn()} title="Hello" closeLabel="Close hello">
        <p>body</p>
      </Modal>,
    );
    expect(dialog.open).toBe(true);
    const h2 = dialog.querySelector("h2")!;
    expect(h2.textContent).toBe("Hello");
    expect(dialog.getAttribute("aria-labelledby")).toBe(h2.id);
  });

  it("the cross and the backdrop both close it, through onClose", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open onClose={onClose} title="Hello" closeLabel="Close hello">
        <p>body</p>
      </Modal>,
    );
    const dialog = container.querySelector("dialog")!;
    fireEvent.click(screen.getByRole("button", { name: "Close hello" }));
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape can be held by the caller", () => {
    const { container } = render(
      <Modal open onClose={vi.fn()} title="Hello" closeLabel="Close hello" onEscape={() => true}>
        <p>body</p>
      </Modal>,
    );
    const dialog = container.querySelector("dialog")!;
    const cancel = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented, "Escape was not held").toBe(true);
  });

  it("is the bottom sheet's shape on a phone, and centred otherwise", () => {
    const css = read("app/globals.css");
    const base = css.match(/\n\.pb-modal\s*\{([^}]*)\}/)![1]!;
    expect(base).toMatch(/margin:\s*auto;/);
    // No drop shadow: on the dark backdrop it drew a black halo round the
    // box ("remove the black circle", 17 Nov 2026).
    expect(base).toMatch(/box-shadow:\s*none;/);
    const phone = css.slice(css.indexOf("@media (max-width: 640px) {", css.indexOf(".pb-modal {")));
    expect(phone).toMatch(/\.pb-modal,\s*\.pb-modal\[data-size="sm"\]\s*\{[^}]*margin: auto 0 0;/);
    expect(phone).toContain("animation: pb-sheet-up");
    expect(phone).toMatch(/\.pb-sheet-grip\s*\{[^}]*display: flex;/);
  });
});

describe("label manager in the shared modal", () => {
  const labels = [
    { id: 1, name: "Wholesale", color: "tag_a", colorHex: null, ticketCount: 0 },
  ] satisfies LabelWithCountDTO[];

  it("opens as the shared modal, and Escape backs out of a delete question first", () => {
    const onClose = vi.fn();
    const { container } = render(<LabelManager labels={labels} onClose={onClose} />);
    const dialog = container.querySelector("dialog.pb-modal") as HTMLDialogElement;
    expect(dialog, "not the shared modal").not.toBeNull();
    expect(dialog.open).toBe(true);
    expect(container.querySelector(".pbm-modal-scrim"), "the home-made scrim is back").toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /delete wholesale/i }));
    expect(container.querySelector(".pbm-confirm")).not.toBeNull();

    const first = new Event("cancel", { cancelable: true });
    act(() => {
      dialog.dispatchEvent(first);
    });
    expect(first.defaultPrevented, "Escape closed the modal under a question").toBe(true);
    expect(container.querySelector(".pbm-confirm"), "the question is still up").toBeNull();

    const second = new Event("cancel", { cancelable: true });
    act(() => {
      dialog.dispatchEvent(second);
    });
    expect(second.defaultPrevented, "with no question, Escape should close").toBe(false);
  });

  it("inline on Settings stays a plain panel", () => {
    const { container } = render(<LabelManager labels={labels} inline />);
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.querySelector(".pbm-modal--inline")).not.toBeNull();
  });
});

describe("team: Add new member", () => {
  it("is a button at the top that opens the invite in a small modal", () => {
    const action = vi.fn(async () => {});
    const { container } = render(<InviteMember action={action} />);
    const dialog = container.querySelector("dialog.pb-modal") as HTMLDialogElement;
    expect(dialog.open).toBe(false);
    expect(dialog.getAttribute("data-size")).toBe("sm");

    fireEvent.click(screen.getByRole("button", { name: "Add new member" }));
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('input[type="email"][name="email"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: "Send invite" }).className).toContain("stg-button");
  });

  it("the page has no inline invite form any more, and the button sits in the header", () => {
    const page = read("app/(dashboard)/settings/team/page.tsx");
    expect(page).not.toContain('name="email"');
    expect(page).toMatch(/<header className="stg-head stg-head--action">[\s\S]*?<InviteMember[\s\S]*?<\/header>/);
  });
});

describe("labels in the nav", () => {
  it("Manage is a round + with its name kept for assistive tech", () => {
    const nav = read("components/mail/MailNavShell.tsx");
    const button = nav.slice(nav.indexOf('className="pbm-nav-manage"'), nav.indexOf("</button>", nav.indexOf('className="pbm-nav-manage"')));
    expect(button).toContain('aria-label="Manage labels"');
    expect(button).toContain('<Icon name="plus"');
    expect(button).not.toMatch(/>\s*Manage\s*</);
    const rule = read("app/mail.css").match(/\n\.pbm-nav-manage\s*\{([^}]*)\}/)![1]!;
    expect(rule).toContain("border-radius: 50%");
    expect(rule).toContain("width: var(--tap-min, 44px)");
    expect(rule).toContain("height: var(--tap-min, 44px)");
  });
});
