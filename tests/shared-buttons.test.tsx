// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import LabelColours from "../components/mail/LabelColours";
import LabelPicker from "../components/mail/LabelPicker";
import type { LabelChipDTO } from "../components/mail/types";

/*
  Jordan, 17 Nov 2026: "these buttons don't conform to any we have done so
  far. go fix these and make them reusable … also these, add the custom one
  here too."
*/

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("one set of buttons", () => {
  it("globals.css has the destructive variant beside primary and secondary", () => {
    const css = read("app/globals.css");
    const danger = css.match(/\n\.stg-button--danger\s*\{([^}]*)\}/);
    expect(danger, "no .stg-button--danger").not.toBeNull();
    expect(danger![1]).toContain("background: var(--pdf-bg)");
    expect(danger![1]).toContain("color: var(--pdf-fg)");
  });

  it("every confirm step uses the shared buttons, and the one-offs are gone", () => {
    const files = [
      "components/mail/LabelManager.tsx",
      "app/(dashboard)/newsletters/AbortPanel.tsx",
      "app/(dashboard)/newsletters/CampaignList.tsx",
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} has no danger button`).toContain('className="stg-button stg-button--danger"');
      expect(src, `${f} has no secondary button`).toContain('className="stg-button stg-button--secondary"');
      expect(src, `${f} still uses a one-off`).not.toMatch(/(pbm|nl)-confirm-btn/);
    }
    for (const f of ["app/mail.css", "app/newsletter.css"]) {
      expect(read(f), `${f} still styles a one-off confirm button`).not.toMatch(/\.(pbm|nl)-confirm-btn/);
    }
  });
});

describe("LabelColours", () => {
  it("lights exactly one control: the preset, or the custom colour when set", () => {
    const onPreset = vi.fn();
    const onCustom = vi.fn();
    const { container, rerender } = render(
      <LabelColours name="VIP" color="tag_b" colorHex={null} onPreset={onPreset} onCustom={onCustom} />,
    );
    const lit = () => [...container.querySelectorAll("[data-on]")];
    expect(lit()).toHaveLength(1);
    expect(lit()[0]!.getAttribute("data-color")).toBe("tag_b");
    expect(container.querySelector('[aria-label="Colour 2 for VIP"]')).not.toBeNull();

    rerender(
      <LabelColours name="VIP" color="tag_b" colorHex="#3d7dd8" onPreset={onPreset} onCustom={onCustom} />,
    );
    expect(lit()).toHaveLength(1);
    expect(lit()[0]!.className).toBe("pbm-label-pick");

    fireEvent.click(container.querySelector('[data-color="tag_c"]')!);
    expect(onPreset).toHaveBeenCalledWith("tag_c");
    fireEvent.change(container.querySelector('input[type="color"]')!, { target: { value: "#112233" } });
    expect(onCustom).toHaveBeenCalledWith("#112233");
  });

  it("the + Label menu offers the custom colour and sends it when creating", async () => {
    const calls: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        calls.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(
          JSON.stringify({ label: { id: 9, name: "New", color: "tag_a", colorHex: "#112233" } }),
          { status: 200 },
        );
      }),
    );
    const labels = [{ id: 1, name: "Wholesale", color: "tag_a", colorHex: null }] satisfies LabelChipDTO[];
    const { container } = render(
      <LabelPicker ticketId={1} labels={[]} allLabels={labels} initiallyOpen />,
    );
    const custom = container.querySelector('.pbm-label-new input[type="color"]');
    expect(custom, "the menu has no custom colour").not.toBeNull();

    fireEvent.change(container.querySelector(".pbm-label-new .pbm-label-input")!, { target: { value: "New" } });
    fireEvent.change(custom!, { target: { value: "#112233" } });
    fireEvent.click(container.querySelector(".pbm-label-create")!);
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0]).toMatchObject({ name: "New", colorHex: "#112233" });
  });
});
