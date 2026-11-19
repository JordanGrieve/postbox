// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import WelcomeEmailForm from "../app/(dashboard)/newsletters/welcome/WelcomeEmailForm";
import { DEFAULT_WELCOME } from "../lib/welcome-store";

/**
 * The welcome email screen, ACTUALLY CLICKED (19 Nov 2026 redesign).
 *
 * The render harness draws it but cannot run it. These are the parts that
 * only exist when it runs: the token chips write into the message, the
 * preview switches between a subscriber with a name and one without, Save is
 * only live with something to save, and what is saved is the stored token
 * form, not the words the box shows.
 */

vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function show(initial = DEFAULT_WELCOME) {
  render(
    <WelcomeEmailForm
      initial={initial}
      hasPostalAddress
      workspaceName="Open Door Bakery"
      legalName="Open Door Bakery Ltd"
      postalAddress={"12 Mill Lane\nStroud\nGL5 1AB"}
      brandAccentHex={null}
      brandSignOff={null}
      viewerEmail="hello@opendoorbakery.co.uk"
      fromAddress="replies@postbox.help"
    />,
  );
}

const message = () => screen.getByLabelText("Message") as HTMLTextAreaElement;
const saveButton = () => screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement;
const preview = () => screen.getByTitle("Welcome email preview") as HTMLIFrameElement;

describe("the welcome email screen", () => {
  it("shows the tokens in words", () => {
    show();
    expect(message().value).toContain("Hi [First name],");
    expect((screen.getByLabelText("Subject") as HTMLInputElement).value).toBe(
      "Thanks for subscribing to [Business name]",
    );
  });

  it("puts a token where the cursor is", () => {
    show({ ...DEFAULT_WELCOME, body: "Hello and welcome" });
    const box = message();
    box.setSelectionRange(5, 5);
    fireEvent.click(screen.getByRole("button", { name: "+ Your business name" }));
    expect(box.value).toBe("Hello[Business name] and welcome");
  });

  it("previews a subscriber with a name, and one without", () => {
    show();
    expect(preview().getAttribute("srcdoc")).toContain("Hi Lesley,");
    fireEvent.click(screen.getByRole("button", { name: "Without" }));
    expect(preview().getAttribute("srcdoc")).toContain("Hi there,");
    expect(screen.getByRole("button", { name: "Without" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("only offers Save when something changed, and says so", () => {
    show();
    expect(saveButton().disabled).toBe(true);
    expect(screen.getByText("Everything is saved.")).toBeTruthy();
    fireEvent.change(message(), { target: { value: "Hi [First name]! Welcome." } });
    expect(saveButton().disabled).toBe(false);
    expect(screen.getByText("You have changes that aren’t saved.")).toBeTruthy();
    // Undone by hand is saved again.
    fireEvent.change(message(), {
      target: { value: DEFAULT_WELCOME.body.replace("{first_name}", "[First name]").replace("{company}", "[Business name]") },
    });
    expect(saveButton().disabled).toBe(true);
  });

  it("saves the stored tokens, not the words in the box", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    show();
    fireEvent.change(message(), { target: { value: "Hi [First name], from [Business name]." } });
    await act(async () => {
      fireEvent.click(saveButton());
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/welcome");
    const sent = JSON.parse(String(init.body)) as { body: string; subject: string; enabled: boolean };
    expect(sent.body).toBe("Hi {first_name}, from {company}.");
    expect(sent.subject).toBe("Thanks for subscribing to {company}");
    expect(sent.enabled).toBe(true);
    expect(saveButton().disabled).toBe(true);
    expect(screen.getByText("Everything is saved.")).toBeTruthy();
  });

  it("does not show a refused switch as on", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "No postal address" }), { status: 400 })),
    );
    show({ ...DEFAULT_WELCOME, enabled: false });
    const sw = screen.getByRole("switch");
    await act(async () => {
      fireEvent.click(sw);
    });
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("alert").textContent).toBe("No postal address");
  });
});
