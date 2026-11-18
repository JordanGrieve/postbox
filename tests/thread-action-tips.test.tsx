// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useTipDismiss, TIPS_HIDDEN_ATTR } from "../lib/use-tip-dismiss";

/*
  The thread header's icon buttons carry a short tooltip (data-tip, drawn by
  CSS under the button) instead of the browser's title tooltip, which never
  shows for a keyboard and duplicated the new one for a mouse.
  Jordan, 17 Nov 2026: "a tooltip should also show at the bottom of it".
*/

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
    // One since the simple inbox (18 Nov 2026): Details. Mark as done is a
    // labelled button and needs no tooltip.
    expect(iconTags.length, "no icon buttons found in the action row").toBeGreaterThanOrEqual(1);
    for (const t of iconTags) {
      expect(t, `an icon button has no data-tip:\n${t}`).toContain("data-tip");
      expect(t, `an icon button still has a title:\n${t}`).not.toMatch(/\btitle=/);
    }
  });

  it("the stylesheet shows the tooltip on hover AND keyboard focus, and hides it on Escape", () => {
    expect(CSS).toContain(".pbm-icon-btn[data-tip]::after");
    expect(CSS).toContain("content: attr(data-tip)");
    // The bubble (::after) and its point (::before) show and hide together.
    for (const part of ["::before", "::after"]) {
      expect(CSS).toMatch(
        new RegExp(`@media \\(hover: hover\\)\\s*\\{[^}]*\\.pbm-icon-btn\\[data-tip\\]:hover${part}`),
      );
      expect(CSS).toContain(`.pbm-icon-btn[data-tip]:focus-visible${part}`);
      expect(CSS).toContain(`html[${TIPS_HIDDEN_ATTR}] .pbm-icon-btn[data-tip]${part}`);
    }
  });

  it("the bubble's point touches the button and overlaps the bubble", () => {
    /*
      Jordan, 17 Nov 2026: "make it touch like a speech bubble so they know
      it's connected". The point starts at the button's bottom edge and is
      taller than the band the bubble leaves clear above itself, so no strip
      of page shows between button, point and bubble.
    */
    // The shared rule's selector also ends in "::after {", so pick each rule
    // by what only it declares.
    const rules = [...CSS.matchAll(/\.pbm-icon-btn\[data-tip\]::(?:before|after)\s*\{([^}]*)\}/g)];
    const point = rules.find((r) => r[1]!.includes("clip-path"));
    const bubble = rules.find((r) => r[1]!.includes("attr(data-tip)"));
    const shared = CSS.match(
      /\.pbm-icon-btn\[data-tip\]::before,\s*\.pbm-icon-btn\[data-tip\]::after\s*\{([^}]*)\}/,
    );
    expect(point, "no rule for the bubble's point").toBeDefined();
    expect(bubble, "no rule for the bubble").toBeDefined();
    expect(shared, "no shared positioning rule").not.toBeNull();
    expect(shared![1]).toContain("top: 100%");
    expect(point![1]).toContain("clip-path: polygon(50% 0");
    const pointH = Number(point![1].match(/height:\s*(\d+)px/)?.[1]);
    const band = Number(bubble![1].match(/border-top:\s*(\d+)px solid transparent/)?.[1]);
    expect(pointH, "point height unreadable").toBeGreaterThan(0);
    expect(band, "bubble's clear band unreadable").toBeGreaterThan(0);
    expect(pointH, "the point must reach into the bubble").toBeGreaterThan(band);
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
