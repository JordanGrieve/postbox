import Link from "next/link";
import { PostboxLockup } from "@/components/Logo";
import MarketingFooter from "@/components/marketing/MarketingFooter";

/*
  The one column the header and the prose share. A ch is relative to the
  font size, so the two must carry the same size as well as the same width or
  they are different boxes: on 22 Nov 2026 the prose went to 46ch while the
  header kept 620px, and the logo sat 42px left of the text.
*/
const COLUMN_WIDTH = "calc(46ch + 48px)";
const COLUMN_FONT_SIZE = "0.90625rem";

/** Shared chrome for the public legal pages. */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--app-bg)",
        color: "var(--ink)",
      }}
    >
      <header
        /* Matches the prose column below, or the lockup floats off its own
           left margin. */
        style={{
          maxWidth: COLUMN_WIDTH,
          fontSize: COLUMN_FONT_SIZE,
          margin: "0 auto",
          padding: "22px 24px 0",
        }}
      >
        <Link prefetch={false}
          href="/"
          /* 44px tall for 2.5.5: the lockup is 30px and this is the only
             control on the page, so it was the one under the floor. */
          style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 44 }}
        >
          <PostboxLockup size={30} fontSize="1.125rem" color="var(--ink)" />
        </Link>
      </header>
      <main
        className="legal-prose"
        /*
          620, not 720.

          1.4.8 asks for a reading width of 80 characters or fewer, and at 720
          with 24px of padding this column was 672px of 14.5px text — about 93
          characters, measured by __textBlocks on 11 Sep 2026. These are the
          longest prose in the product and the only pages a stranger reads
          end to end.

          It then became 620px, chosen as "54ch", but 54ch was measured at
          82–90 characters on real sentences (22 Nov 2026). It is now the
          house 46ch plus the 48px of padding, in ch so it follows the text
          size — the same reading width as .pbm-bubble and .ct-unset.
        */
        style={{
          maxWidth: COLUMN_WIDTH,
          margin: "0 auto",
          padding: "28px 24px 72px",
          fontSize: COLUMN_FONT_SIZE,
          lineHeight: 1.7,
        }}
      >
        {/*
          Paragraph spacing lives here rather than on each <p>. The reset
          zeroes block margins, which never showed while every section was a
          heading plus one paragraph — the h2 margin carried the rhythm. These
          pages now run several paragraphs per section, so without this they
          set as one wall of text. Scoped to the legal pages only.
        */}
        <style>{`
          .legal-prose p { margin: 0 0 12px; }
          .legal-prose p:last-child { margin-bottom: 0; }
          /* The reset strips list markers. These lists are enumerations of
             obligations and prohibitions, so the bullets carry meaning. */
          .legal-prose ul { margin: 0 0 12px; padding-left: 22px; list-style: disc; }
          .legal-prose ol { margin: 0 0 12px; padding-left: 22px; list-style: decimal; }
          .legal-prose li { margin-bottom: 6px; }
          .legal-prose li::marker { color: var(--muted); }
          /* Links in the prose are underlined: the accent is 1.65:1 against
             the body ink, so colour alone did not mark them (1.4.1). */
          .legal-prose a { text-decoration: underline; text-underline-offset: 2px; }
          .legal-prose code {
            font-family: var(--font-mono);
            font-size: 0.92em;
            overflow-wrap: anywhere;
          }
        `}</style>
        {children}
      </main>
      {/* Who runs Postbox and how to reach them, as on every public page. */}
      <MarketingFooter />
    </div>
  );
}
