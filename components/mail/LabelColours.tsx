"use client";

import type { LabelColor } from "@/db/schema";

export const COLOR_ORDER: LabelColor[] = ["tag_a", "tag_b", "tag_c"];

/** What the custom picker shows before a custom colour has been chosen. */
const CUSTOM_DEFAULT = "#737373";

/**
 * The colour choice for a label: the three presets and "any colour".
 *
 * One component since 17 Nov 2026. The Labels window drew this in two places
 * (each label's row and the new-label row) and the thread's "+ Label" menu
 * drew a third copy with no custom colour at all. Jordan: "make them
 * reusable … add the custom one here too".
 *
 * A PRESET IS ONLY LIT WHEN NO CUSTOM COLOUR IS SET. `color` keeps whatever
 * token the label had before a custom colour was picked, and `colorHex` is
 * what wins at render time (labelChipProps), so it has to win here too, or the
 * ring points at a colour that is not in force. Exactly one control in the
 * group is ever ringed.
 *
 * The custom control is a native input rather than a drawn wheel: it is the
 * platform's own picker, keyboard-operable and translated, and on a phone it
 * opens the system one.
 */
export default function LabelColours({
  name,
  color,
  colorHex,
  onPreset,
  onCustom,
}: {
  /** Names the group and each control: "Colour 2 for Wholesale". Omit for a
   *  label that does not exist yet. */
  name?: string;
  color: LabelColor;
  colorHex: string | null;
  /** A preset was chosen. The caller clears its custom colour. */
  onPreset: (c: LabelColor) => void;
  onCustom: (hex: string) => void;
}) {
  const forName = name ? ` for ${name}` : "";
  return (
    <div
      className="pbm-swatches"
      role="radiogroup"
      aria-label={name ? `Colour for ${name}` : "Colour for the new label"}
    >
      {COLOR_ORDER.map((c, i) => {
        const on = colorHex === null && color === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`Colour ${i + 1}${forName}`}
            className="pbm-label-swatch pbm-label-swatch--pick"
            data-color={c}
            data-on={on || undefined}
            onClick={() => onPreset(c)}
          />
        );
      })}
      <input
        type="color"
        className="pbm-label-pick"
        aria-label={name ? `Pick any colour for ${name}` : "Pick any colour for the new label"}
        data-on={colorHex !== null || undefined}
        value={colorHex ?? CUSTOM_DEFAULT}
        onChange={(e) => onCustom(e.target.value)}
      />
    </div>
  );
}
