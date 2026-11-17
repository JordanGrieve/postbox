// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import StarButton from "../components/mail/StarButton";
import { useTipDismiss, TIPS_HIDDEN_ATTR } from "../lib/use-tip-dismiss";

/*
  The thread header's icon buttons carry a short tooltip (data-tip, drawn by
  CSS under the button) instead of the browser's title tooltip, which never
  shows for a keyboard and duplicated the new one for a mouse.
  Jordan, 17 Nov 2026: "a tooltip should also show at the bottom of it".
*/

vi.mock("../components/mail/live", () => ({ publishStar: vi.fn() }));

afterEach(cleanup);

const THREAD = readFileSync(
  join(__dirname, "..", "components", "mail", "Thread.tsx"),
  "utf8",
);
const CSS = readFileSync(join(__dirname, "..", "app", "mail.css"), "utf8");

describe("thread header tooltips", () => {
  it("every icon button in the action row names itself in data-tip, with no title", () => {
    const start = THREAD.indexOf('className="pbm-thread-actions"');
    const end = THREAD.indexOf("</header>", start);
    expect(start, "the action row was not found in Thread.tsx").toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const row = THREAD.slice(start, end);

    // Every button or link, up to its first child element (the icon). Not up
    // to the first ">": an arrow function in onClick has one.
    const tags = row.split(/<(?:button|a)\b/).slice(1).map((t) => t.slice(0, t.indexOf("<")));
    const iconTags = tags.filter((t) => t.includes("pbm-icon-btn"));
    expect(iconTags.length, "no icon buttons found in the action row").toBeGreaterThanOrEqual(7);
    for (const t of iconTags) {
      expect(t, `an icon button has no data-tip:\n${t}`).toContain("data-tip");
      expect(t, `an icon button still has a title:\n${t}`).not.toMatch(/\btitle=/);
    }
    // The star is a component; it must be asked for its tooltip.
    expect(row).toMatch(/<StarButton[^>]*\btip\b/);
  });

  it("the star's tooltip follows its state, and the list star keeps its title", () => {
    const { container, rerender } = render(
      <StarButton ticketId={1} starred={false} canStar tip />,
    );
    let btn = container.querySelector("button")!;
    expect(btn.getAttribute("data-tip")).toBe("Star");
    expect(btn.hasAttribute("title")).toBe(false);

    rerender(<StarButton ticketId={1} starred canStar tip />);
    btn = container.querySelector("button")!;
    expect(btn.getAttribute("data-tip")).toBe("Unstar");

    rerender(<StarButton ticketId={1} starred canStar className="pbm-card-star" />);
    btn = container.querySelector("button")!;
    expect(btn.hasAttribute("data-tip")).toBe(false);
    expect(btn.getAttribute("title")).toBe("Remove star");
  });

  it("the stylesheet shows the tooltip on hover AND keyboard focus, and hides it on Escape", () => {
    expect(CSS).toContain(".pbm-icon-btn[data-tip]::after");
    expect(CSS).toContain("content: attr(data-tip)");
    expect(CSS).toMatch(/@media \(hover: hover\)\s*\{\s*\.pbm-icon-btn\[data-tip\]:hover::after/);
    expect(CSS).toContain(".pbm-icon-btn[data-tip]:focus-visible::after");
    expect(CSS).toContain(`html[${TIPS_HIDDEN_ATTR}] .pbm-icon-btn[data-tip]::after`);
  });

  it("hover fills the icon button with the accent and its own ink", () => {
    const rule = CSS.match(/\.pbm-icon-btn:hover:not\(:disabled\)\s*\{([^}]*)\}/);
    expect(rule, "no hover rule for .pbm-icon-btn").not.toBeNull();
    expect(rule![1]).toContain("background: var(--accent-grad)");
    expect(rule![1]).toContain("color: var(--on-accent)");
  });
});

function Probe() {
  useTipDismiss();
  return <button>x</button>;
}

describe("useTipDismiss (WCAG 1.4.13)", () => {
  it("Escape hides the tooltips; the next pointer move or focus brings them back", () => {
    const root = document.documentElement;
    const { getByText, unmount } = render(<Probe />);
    expect(root.hasAttribute(TIPS_HIDDEN_ATTR)).toBe(false);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(root.hasAttribute(TIPS_HIDDEN_ATTR)).toBe(true);

    fireEvent.pointerMove(document);
    expect(root.hasAttribute(TIPS_HIDDEN_ATTR)).toBe(false);

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.focusIn(getByText("x"));
    expect(root.hasAttribute(TIPS_HIDDEN_ATTR)).toBe(false);

    fireEvent.keyDown(document, { key: "a" });
    expect(root.hasAttribute(TIPS_HIDDEN_ATTR)).toBe(false);

    fireEvent.keyDown(document, { key: "Escape" });
    unmount();
    expect(root.hasAttribute(TIPS_HIDDEN_ATTR), "left behind after unmount").toBe(false);
  });
});
