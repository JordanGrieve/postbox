// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent, act, screen } from "@testing-library/react";

/**
 * Settings → Your business, read-then-Change (20 Nov 2026 design).
 *
 * Executed, not just rendered: each line opens its editor in place, saves only
 * its own field through PATCH /api/workspace, and hands focus back to the
 * button that opened it. The static harness in settings-views-render can only
 * see read mode.
 */

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: () => {}, replace: () => {}, back: () => {}, prefetch: () => {} }),
  usePathname: () => "/settings",
  useSearchParams: () => new URLSearchParams(""),
}));

import BusinessDetails, {
  type BusinessDetailsProps,
} from "../app/(dashboard)/settings/BusinessDetails";

const EMPTY = {
  name: "Open Door Bakery",
  legalName: null,
  postalAddress: null,
  brandAccentHex: null,
  brandSignOff: null,
  theme: "light",
} satisfies BusinessDetailsProps;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  refresh.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** The JSON body of the n-th PATCH. */
function patchBody(n = 0): unknown {
  const [url, init] = fetchMock.mock.calls[n] as [string, RequestInit];
  expect(url).toBe("/api/workspace");
  expect(init.method).toBe("PATCH");
  return JSON.parse(String(init.body));
}

describe("BusinessDetails — read mode", () => {
  it("reads every value, with Add on the empty optional lines", () => {
    render(<BusinessDetails {...EMPTY} />);
    expect(screen.getByText("Open Door Bakery")).toBeTruthy();
    expect(screen.getByText("Not added yet")).toBeTruthy();
    expect(screen.getByText("You’ll need this before you send a newsletter.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Change business name" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add postal address" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add sign-off on newsletters" })).toBeTruthy();
    expect(screen.getByText(/Postbox default/)).toBeTruthy();
    expect(screen.getByText("Light")).toBeTruthy();
  });

  it("names the theme the app actually shows, for a stored legacy value", () => {
    // 22 Nov 2026 journey test: a new workspace stores the column default
    // "terracotta", which themeAttr paints DARK — and this line said "Light",
    // with neither option ticked in the picker.
    render(<BusinessDetails {...EMPTY} theme="terracotta" />);
    expect(screen.getByText("Dark")).toBeTruthy();
    expect(screen.queryByText("Light")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Change postbox appearance" }));
    const dark = screen.getByRole("radio", { name: /Dark/ }) as HTMLInputElement;
    expect(dark.checked).toBe(true);
  });

  it("says Change, not Add, once a value exists, and drops the warning", () => {
    render(
      <BusinessDetails
        {...EMPTY}
        postalAddress={"12 Mill Lane\nStroud"}
        brandSignOff="— Emma"
        brandAccentHex="#1f5c3d"
      />,
    );
    expect(screen.getByRole("button", { name: "Change postal address" })).toBeTruthy();
    expect(screen.queryByText("You’ll need this before you send a newsletter.")).toBeNull();
    expect(screen.getByText("#1f5c3d")).toBeTruthy();
  });
});

describe("BusinessDetails — Change", () => {
  it("opens one line's editor in place, focused, with the stored value", () => {
    render(<BusinessDetails {...EMPTY} />);
    fireEvent.click(screen.getByRole("button", { name: "Change business name" }));

    const input = screen.getByRole("textbox", { name: "Business name" }) as HTMLInputElement;
    expect(input.value).toBe("Open Door Bakery");
    expect(document.activeElement).toBe(input);
    // Only that line is open.
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("saves only its own field, closes, says so, and gives focus back", async () => {
    render(<BusinessDetails {...EMPTY} />);
    fireEvent.click(screen.getByRole("button", { name: "Add sign-off on newsletters" }));
    const input = screen.getByRole("textbox", { name: "Sign-off on newsletters" });
    fireEvent.change(input, { target: { value: "Best wishes, Sam" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(patchBody()).toEqual({ brandSignOff: "Best wishes, Sam" });
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Saved.")).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Add sign-off on newsletters" }),
    );
  });

  it("Escape cancels without saving and returns focus", () => {
    render(<BusinessDetails {...EMPTY} />);
    const change = screen.getByRole("button", { name: "Change business name" });
    fireEvent.click(change);
    const input = screen.getByRole("textbox", { name: "Business name" });
    fireEvent.change(input, { target: { value: "Something else" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Change business name" }),
    );
  });

  it("will not save a blank business name, and says why", () => {
    render(<BusinessDetails {...EMPTY} />);
    fireEvent.click(screen.getByRole("button", { name: "Change business name" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Business name" }), {
      target: { value: "   " },
    });

    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(screen.getByText("Your business needs a name.")).toBeTruthy();
  });

  it("keeps the editor open and shows the server's reason when a save fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "That is not a colour." }), { status: 400 }),
    );
    render(<BusinessDetails {...EMPTY} />);
    fireEvent.click(screen.getByRole("button", { name: "Change business name" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Business name" }), {
      target: { value: "Open Door" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    expect(screen.getByRole("alert").textContent).toContain("That is not a colour.");
    expect(screen.getByRole("textbox", { name: "Business name" })).toBeTruthy();
  });

  it("sends an empty string to clear an optional field", async () => {
    render(<BusinessDetails {...EMPTY} legalName="Open Door Bakery Ltd" />);
    fireEvent.click(screen.getByRole("button", { name: "Change name in newsletter footers" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Name in newsletter footers" }), {
      target: { value: "" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(patchBody()).toEqual({ legalName: "" });
  });
});
