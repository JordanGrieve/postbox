"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useDismiss } from "@/lib/use-dismiss";
import { labelChipProps } from "./label-style";
import { useRouter } from "next/navigation";
import type { LabelColor } from "@/db/schema";
import { Icon } from "./icons";
import type { LabelChipDTO } from "./types";
import LabelColours from "./LabelColours";

/**
 * The labels on one ticket, plus the menu that adds and removes them.
 *
 * Colour never reaches this file as a value: the chip carries `data-color` and
 * mail.css resolves it to the --tag-* token pair, so a label repaints with the
 * theme instead of being frozen at whatever it looked like when it was made.
 *
 * Menu behaviour matches the status menu next to it — Esc and a click outside
 * close it, and the trigger carries aria-haspopup/aria-expanded.
 */


export default function LabelPicker({
  ticketId,
  labels,
  allLabels,
  initiallyOpen = false,
}: {
  ticketId: number;
  /** Labels currently on this ticket, from the server. */
  labels: LabelChipDTO[];
  /** Every label in the workspace, for the menu. */
  allLabels: LabelChipDTO[];
  /**
   * Render with the menu already open. Only the render harness passes it: a
   * static page cannot click "+ Label", and the menu is the part that needs
   * measuring.
   */
  initiallyOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [current, setCurrent] = useState<LabelChipDTO[]>(labels);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<LabelColor>("tag_a");
  /** A custom colour for the new label; wins over newColor when set. */
  const [newHex, setNewHex] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * Screen-reader narration. `aria-checked` on the menu items covers toggling
   * from inside the open menu, but says nothing about the chips outside it —
   * and the "x" on a chip removes a label from a control that then disappears,
   * taking any state announcement with it.
   */
  const [announcement, setAnnouncement] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Adopt the server's answer when the page refreshes underneath us.
  const [lastProp, setLastProp] = useState(labels);
  if (lastProp !== labels) {
    setLastProp(labels);
    setCurrent(labels);
  }

  useDismiss(open, () => setOpen(false), menuRef);

  /*
    The menu opens under "+ Label", starting at its left edge. When that
    would run it off the right of the pane (the button wraps to x=257 of 375
    on a phone), it moves left by exactly the overshoot, and never past the
    pane's left edge. A plain flip to the button's right edge was tried first
    and was wrong the other way: with the button at x=105, a 272px menu
    right-aligned to it starts at -95. The boundary is the thread pane, not
    the window: on a desktop the contact column sits to its right.
  */
  const dropRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const menu = dropRef.current;
    if (!open || !menu) return;
    menu.style.left = "";
    const pane = (menu.closest(".pbm-thread") ?? document.documentElement).getBoundingClientRect();
    const right = Math.min(pane.right, document.documentElement.clientWidth) - 8;
    const left = Math.max(pane.left, 0) + 8;
    const r = menu.getBoundingClientRect();
    const shift = Math.min(r.right - right, r.left - left);
    if (shift > 0) menu.style.left = `${-shift}px`;
  }, [open]);

  const onIds = new Set(current.map((l) => l.id));

  async function toggle(label: LabelChipDTO, on: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const before = current;
    setCurrent(
      on
        ? [...current, label].sort((a, b) => a.name.localeCompare(b.name))
        : current.filter((l) => l.id !== label.id),
    );
    const res = await fetch(`/api/tickets/${ticketId}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labelId: label.id, on }),
    });
    setBusy(false);
    if (!res.ok) {
      setCurrent(before);
      setError("Couldn't change that label.");
      setAnnouncement(`Couldn't change label ${label.name}. Nothing was saved.`);
      return;
    }
    const data = (await res.json()) as { labels?: LabelChipDTO[] };
    if (data.labels) setCurrent(data.labels);
    setAnnouncement(
      on ? `Label ${label.name} added.` : `Label ${label.name} removed.`,
    );
    router.refresh();
  }

  async function createAndApply() {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color: newColor, colorHex: newHex }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Couldn't create that label.");
      return;
    }
    const data = (await res.json()) as { label: LabelChipDTO };
    setNewName("");
    setNewHex(null);
    await toggle(data.label, true);
  }

  return (
    <div className="pbm-labels" ref={menuRef}>
      {/* Mounted always, empty until there is something to say — a live region
          inserted alongside its own text is frequently not announced. */}
      <span className="pbm-sr" role="status" aria-live="polite">
        {announcement}
      </span>

      {current.map((l) => (
        <span key={l.id} className="pbm-label" {...labelChipProps(l)}>
          <span className="pbm-label-name">{l.name}</span>
          <button
            type="button"
            className="pbm-label-x"
            aria-label={`Remove label ${l.name}`}
            title={`Remove label ${l.name}`}
            onClick={() => void toggle(l, false)}
          >
            <Icon name="close" size={10} strokeWidth={3} />
          </button>
        </span>
      ))}

      {/*
        The button and its menu share a positioned box, so the menu opens
        under "+ Label". .pbm-labels is display: contents and has no box to
        anchor to, so the menu used to hang from the chip row's left edge,
        well away from the button that opened it. Jordan, 17 Nov 2026: "it
        should come under the label button not far left".
      */}
      <span className="pbm-label-anchor">
      <button
        type="button"
        className="pbm-label-add"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Add or remove labels"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="label" size={12} strokeWidth={2} />
        <span>Label</span>
      </button>

      {open && (
        <div className="pbm-menu pbm-menu--labels" role="menu" ref={dropRef}>
          {allLabels.length === 0 && (
            <p className="pbm-menu-note">
              No labels yet. Make the first one below.
            </p>
          )}
          {allLabels.map((l) => {
            const on = onIds.has(l.id);
            return (
              <button
                key={l.id}
                role="menuitemcheckbox"
                aria-checked={on}
                className="pbm-menu-item"
                onClick={() => void toggle(l, !on)}
              >
                <span className="pbm-label-swatch" {...labelChipProps(l)} />
                <span className="pbm-menu-text">{l.name}</span>
                {on && <span className="pbm-menu-check">✓</span>}
              </button>
            );
          })}

          <div className="pbm-menu-divider" />
          <div className="pbm-label-new">
            <input
              className="pbm-label-input"
              value={newName}
              maxLength={40}
              placeholder="New label…"
              aria-label="Name for a new label"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void createAndApply();
                }
              }}
            />
            <div className="pbm-label-new-row">
              <LabelColours
                color={newColor}
                colorHex={newHex}
                onPreset={(c) => {
                  setNewColor(c);
                  setNewHex(null);
                }}
                onCustom={setNewHex}
              />
              <button
                type="button"
                className="stg-button pbm-label-create"
                disabled={!newName.trim() || busy}
                onClick={() => void createAndApply()}
              >
                Add
              </button>
            </div>
          </div>
          {error && (
            <p className="pbm-menu-note pbm-menu-note--error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      </span>
    </div>
  );
}
